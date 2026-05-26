import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getRequestUser } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { uploadToR2, deleteFromR2, keyFromUrl } from "@/lib/r2";

type MediaKind = "cover" | "gallery" | "video";
type RouteContext = { params: Promise<{ id: string }> };

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;  // 5 MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
const MAX_GALLERY = 10;

// ---------------------------------------------------------------------------
// GET current media state for a listing (used by UI to refresh after upload)
// ---------------------------------------------------------------------------
async function getMediaState(id: string) {
  const db = getDb();
  const row = await db.execute({
    sql: "SELECT cover_image_url, gallery_json, video_url FROM listings WHERE id = ?",
    args: [id],
  });
  if (row.rows.length === 0) return null;
  const r = row.rows[0];
  return {
    cover_image_url: (r.cover_image_url as string | null) ?? null,
    gallery_urls: parseGalleryJson(r.gallery_json as string | null),
    video_url: (r.video_url as string | null) ?? null,
  };
}

function parseGalleryJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    // ignore parse error
  }
  return [];
}

// ---------------------------------------------------------------------------
// POST — upload media files
// ---------------------------------------------------------------------------
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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart/form-data" }, { status: 400 });
  }

  const kind = formData.get("kind") as string | null;
  if (!kind || !["cover", "gallery", "video"].includes(kind)) {
    return NextResponse.json(
      { error: "Invalid or missing 'kind'. Must be cover | gallery | video" },
      { status: 400 },
    );
  }
  const mediaKind = kind as MediaKind;

  const files = formData.getAll("file") as File[];
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  // For cover/video — only single file makes sense; still accept but use only the first
  const filesToProcess = mediaKind === "gallery" ? files : [files[0]];

  // Validate all files before uploading any
  for (const file of filesToProcess) {
    if (mediaKind === "cover" || mediaKind === "gallery") {
      if (!IMAGE_TYPES[file.type]) {
        return NextResponse.json(
          {
            error: `Invalid image type '${file.type}'. Accepted: image/jpeg, image/png, image/webp`,
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_IMAGE_BYTES) {
        return NextResponse.json(
          { error: `File '${file.name}' exceeds the 5 MB limit` },
          { status: 400 },
        );
      }
    } else {
      // video
      if (!VIDEO_TYPES[file.type]) {
        return NextResponse.json(
          {
            error: `Invalid video type '${file.type}'. Accepted: video/mp4, video/webm`,
          },
          { status: 400 },
        );
      }
      if (file.size > MAX_VIDEO_BYTES) {
        return NextResponse.json(
          { error: `File '${file.name}' exceeds the 50 MB limit` },
          { status: 400 },
        );
      }
    }
  }

  // For gallery: pre-check capacity
  if (mediaKind === "gallery") {
    const current = await getMediaState(listingId);
    const existingCount = current?.gallery_urls.length ?? 0;
    if (existingCount + filesToProcess.length > MAX_GALLERY) {
      return NextResponse.json(
        {
          error: `Gallery is at capacity. Max ${MAX_GALLERY} images. Currently ${existingCount}, adding ${filesToProcess.length} would exceed limit.`,
        },
        { status: 400 },
      );
    }
  }

  // Upload each file
  const uploadedUrls: string[] = [];
  for (const file of filesToProcess) {
    const ext =
      mediaKind === "gallery" || mediaKind === "cover"
        ? IMAGE_TYPES[file.type]
        : VIDEO_TYPES[file.type];
    const arrayBuffer = await file.arrayBuffer();
    const body = Buffer.from(arrayBuffer);
    const result = await uploadToR2({
      body,
      contentType: file.type,
      keyPrefix: `listings/${listingId}`,
      extension: ext,
    });
    uploadedUrls.push(result.publicUrl);
  }

  // Persist to database
  if (mediaKind === "cover") {
    await db.execute({
      sql: "UPDATE listings SET cover_image_url = ?, updated_at = datetime('now') WHERE id = ?",
      args: [uploadedUrls[0], listingId],
    });
  } else if (mediaKind === "video") {
    await db.execute({
      sql: "UPDATE listings SET video_url = ?, updated_at = datetime('now') WHERE id = ?",
      args: [uploadedUrls[0], listingId],
    });
  } else {
    // gallery — append
    const current = await getMediaState(listingId);
    const existing = current?.gallery_urls ?? [];
    const updated = [...existing, ...uploadedUrls];
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
      JSON.stringify({ kind: mediaKind, addedCount: uploadedUrls.length }),
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
