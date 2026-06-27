import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { deleteFromR2, keyFromUrl } from "@/lib/r2";
import { type MediaKind, getMediaState } from "@/lib/media-constants";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// DELETE — remove a single media item
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: listingId } = await context.params;
  const url = new URL(request.url);
  const keyParam = url.searchParams.get("key");
  const kindParam = url.searchParams.get("kind") as MediaKind | null;

  if (!keyParam) {
    return NextResponse.json({ error: "Missing 'key' query param" }, { status: 400 });
  }
  if (!kindParam || !["cover", "gallery", "video"].includes(kindParam)) {
    return NextResponse.json(
      { error: "Invalid or missing 'kind'. Must be cover | gallery | video" },
      { status: 400 },
    );
  }

  const db = getDb();
  const check = await db.execute({
    sql: "SELECT id FROM listings WHERE id = ?",
    args: [listingId],
  });
  if (check.rows.length === 0) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const r2Key = keyFromUrl(keyParam);

  if (kindParam === "cover") {
    await db.execute({
      sql: "UPDATE listings SET cover_image_url = NULL, updated_at = datetime('now') WHERE id = ?",
      args: [listingId],
    });
  } else if (kindParam === "video") {
    await db.execute({
      sql: "UPDATE listings SET video_url = NULL, updated_at = datetime('now') WHERE id = ?",
      args: [listingId],
    });
  } else {
    // gallery — remove the matching entry
    const current = await getMediaState(listingId);
    const filtered = (current?.gallery_urls ?? []).filter((u) => u !== keyParam);
    await db.execute({
      sql: "UPDATE listings SET gallery_json = ?, updated_at = datetime('now') WHERE id = ?",
      args: [filtered.length > 0 ? JSON.stringify(filtered) : null, listingId],
    });
  }

  // Delete from R2 (best-effort — don't fail the request if R2 delete errors)
  try {
    await deleteFromR2(r2Key);
  } catch (err) {
    console.error("[R2] deleteFromR2 failed for key", r2Key, err);
  }

  // Activity log
  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, 'listing_media_delete', 'listing', ?, 'businesses', ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      listingId,
      JSON.stringify({ kind: kindParam, key: keyParam }),
    ],
  });

  const state = await getMediaState(listingId);
  return NextResponse.json({
    ok: true,
    cover_image_url: state?.cover_image_url ?? null,
    gallery_urls: state?.gallery_urls ?? [],
    video_url: state?.video_url ?? null,
  });
}
