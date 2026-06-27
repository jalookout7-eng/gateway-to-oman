import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/token";
import { getDb } from "@/lib/db/client";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { buildR2Key, buildPublicUrl, presignPutUrl } from "@/lib/r2";
import {
  type MediaKind,
  IMAGE_TYPES,
  VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_GALLERY,
  getMediaState,
} from "@/lib/media-constants";

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

  // Rate limit: 30 presign requests per minute per IP
  const rl = await rateLimit("media-presign", getClientIp(request), 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many upload requests. Try again shortly." },
      { status: 429 },
    );
  }

  let body: { slot: unknown; contentType: unknown; size: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { slot, contentType, size } = body;

  if (!slot || !["cover", "gallery", "video"].includes(slot as string)) {
    return NextResponse.json(
      { error: "Invalid or missing 'slot'. Must be cover | gallery | video" },
      { status: 400 },
    );
  }
  const mediaSlot = slot as MediaKind;

  if (typeof contentType !== "string" || !contentType) {
    return NextResponse.json({ error: "Missing 'contentType'" }, { status: 400 });
  }
  if (typeof size !== "number" || size <= 0) {
    return NextResponse.json({ error: "Missing or invalid 'size'" }, { status: 400 });
  }

  // Validate contentType against allowlist; derive extension from it (not filename)
  let ext: string;
  if (mediaSlot === "cover" || mediaSlot === "gallery") {
    if (!IMAGE_TYPES[contentType]) {
      return NextResponse.json(
        { error: `Invalid image type '${contentType}'. Accepted: image/jpeg, image/png, image/webp` },
        { status: 400 },
      );
    }
    if (size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the 15 MB image limit` },
        { status: 400 },
      );
    }
    ext = IMAGE_TYPES[contentType];
  } else {
    if (!VIDEO_TYPES[contentType]) {
      return NextResponse.json(
        { error: `Invalid video type '${contentType}'. Accepted: video/mp4, video/webm` },
        { status: 400 },
      );
    }
    if (size > MAX_VIDEO_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the 50 MB video limit` },
        { status: 400 },
      );
    }
    ext = VIDEO_TYPES[contentType];
  }

  // For gallery: verify capacity before issuing a presigned URL
  if (mediaSlot === "gallery") {
    const current = await getMediaState(listingId);
    const existingCount = current?.gallery_urls.length ?? 0;
    if (existingCount >= MAX_GALLERY) {
      return NextResponse.json(
        { error: `Gallery is at capacity (max ${MAX_GALLERY} images)` },
        { status: 400 },
      );
    }
  }

  const key = buildR2Key(`listings/${listingId}`, ext);
  const publicUrl = buildPublicUrl(key);
  const uploadUrl = await presignPutUrl({ key, contentType });

  return NextResponse.json({ uploadUrl, publicUrl, key });
}
