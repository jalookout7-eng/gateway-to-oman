import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { deleteFromR2, keyFromUrl, buildPublicUrl } from "@/lib/r2";
import { type MediaKind, MAX_GALLERY, getMediaState } from "@/lib/media-constants";

// Matches keys produced by buildR2Key: listings/<id>/<epoch13>-<hex16>.<ext>
const VALID_KEY_RE = /^listings\/[^/]+\/\d{13}-[0-9a-f]{16}\.(jpg|png|webp|mp4|webm)$/;

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const authError = await requireAuth(request);
  if (authError) return authError;

  const { id: listingId } = await context.params;

  // Verify listing exists
  const db = getDb();
  const check = await db.execute({
    sql: "SELECT id FROM listings WHERE id = ?",
    args: [listingId],
  });
  if (check.rows.length === 0) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  let body: { slot: unknown; key: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slot, key } = body;

  if (!slot || !["cover", "gallery", "video"].includes(slot as string)) {
    return NextResponse.json(
      { error: "Invalid or missing 'slot'. Must be cover | gallery | video" },
      { status: 400 },
    );
  }
  const mediaSlot = slot as MediaKind;

  if (typeof key !== "string" || !key) {
    return NextResponse.json({ error: "Missing 'key'" }, { status: 400 });
  }

  // Verify ownership: key must belong to this listing AND match the exact
  // shape produced by buildR2Key (epoch13 + hex16 + known extension).
  // This blocks path traversal, cross-listing writes, and arbitrary URL injection.
  if (!key.startsWith(`listings/${listingId}/`) || !VALID_KEY_RE.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 403 });
  }

  // Derive the public URL server-side — never trust the client-supplied value.
  const publicUrl = buildPublicUrl(key);

  // Persist to DB
  if (mediaSlot === "cover") {
    // Capture old URL before overwriting so we can clean up R2
    const oldRow = await db.execute({
      sql: "SELECT cover_image_url FROM listings WHERE id = ?",
      args: [listingId],
    });
    const oldUrl = oldRow.rows[0]?.cover_image_url as string | null;

    await db.execute({
      sql: "UPDATE listings SET cover_image_url = ?, updated_at = datetime('now') WHERE id = ?",
      args: [publicUrl, listingId],
    });

    if (oldUrl) {
      try {
        await deleteFromR2(keyFromUrl(oldUrl));
      } catch (err) {
        console.error("[R2] best-effort cover cleanup failed", err);
      }
    }
  } else if (mediaSlot === "video") {
    const oldRow = await db.execute({
      sql: "SELECT video_url FROM listings WHERE id = ?",
      args: [listingId],
    });
    const oldUrl = oldRow.rows[0]?.video_url as string | null;

    await db.execute({
      sql: "UPDATE listings SET video_url = ?, updated_at = datetime('now') WHERE id = ?",
      args: [publicUrl, listingId],
    });

    if (oldUrl) {
      try {
        await deleteFromR2(keyFromUrl(oldUrl));
      } catch (err) {
        console.error("[R2] best-effort video cleanup failed", err);
      }
    }
  } else {
    // gallery — append, re-checking capacity
    const current = await getMediaState(listingId);
    const existing = current?.gallery_urls ?? [];
    if (existing.length >= MAX_GALLERY) {
      return NextResponse.json(
        { error: `Gallery is at capacity (max ${MAX_GALLERY} images)` },
        { status: 400 },
      );
    }
    const updated = [...existing, publicUrl];
    await db.execute({
      sql: "UPDATE listings SET gallery_json = ?, updated_at = datetime('now') WHERE id = ?",
      args: [JSON.stringify(updated), listingId],
    });
  }

  // Activity log
  const user = await getRequestUser(request);
  await db.execute({
    sql: `INSERT INTO activity_log (actor_type, actor_id, action, target_type, target_id, source, metadata_json)
          VALUES (?, ?, 'listing_media_upload', 'listing', ?, 'businesses', ?)`,
    args: [
      user ? "admin" : "system",
      user?.id ?? null,
      listingId,
      JSON.stringify({ kind: mediaSlot, key }),
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
