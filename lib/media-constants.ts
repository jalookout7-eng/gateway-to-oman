import { getDb } from "@/lib/db/client";
import { toPublicUrl } from "@/lib/r2";

export type MediaKind = "cover" | "gallery" | "video";

export const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const VIDEO_TYPES: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_GALLERY = 10;

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

export async function getMediaState(id: string) {
  const db = getDb();
  const row = await db.execute({
    sql: "SELECT cover_image_url, gallery_json, video_url FROM listings WHERE id = ?",
    args: [id],
  });
  if (row.rows.length === 0) return null;
  const r = row.rows[0];
  const gallery = parseGalleryJson(r.gallery_json as string | null);
  return {
    cover_image_url: toPublicUrl((r.cover_image_url as string | null) ?? null),
    gallery_urls: gallery.map((u) => toPublicUrl(u) ?? u),
    video_url: toPublicUrl((r.video_url as string | null) ?? null),
  };
}
