import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 not configured: set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY",
    );
  }
  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export interface UploadResult {
  key: string;
  publicUrl: string;
}

export function buildR2Key(keyPrefix: string, extension: string): string {
  const random = randomBytes(8).toString("hex");
  return `${keyPrefix.replace(/\/$/, "")}/${Date.now()}-${random}.${extension}`;
}

export function buildPublicUrl(key: string): string {
  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) throw new Error("R2_BUCKET not set");
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").trim().replace(/\/$/, "");
  return publicBase
    ? `${publicBase}/${key}`
    : `${process.env.R2_ENDPOINT}/${bucket}/${key}`;
}

export async function presignPutUrl(opts: {
  key: string;
  contentType: string;
  expiresIn?: number;
}): Promise<string> {
  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) throw new Error("R2_BUCKET not set");
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket, Key: opts.key, ContentType: opts.contentType }),
    { expiresIn: opts.expiresIn ?? 300 },
  );
}

export async function uploadToR2(opts: {
  body: Buffer;
  contentType: string;
  keyPrefix: string;
  extension: string;
}): Promise<UploadResult> {
  const bucket = process.env.R2_BUCKET?.trim();
  if (!bucket) throw new Error("R2_BUCKET not set");
  const key = buildR2Key(opts.keyPrefix, opts.extension);
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
  const publicUrl = buildPublicUrl(key);
  return { key, publicUrl };
}

export async function deleteFromR2(key: string): Promise<void> {
  const bucket = process.env.R2_BUCKET;
  if (!bucket) throw new Error("R2_BUCKET not set");
  await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * Derive the R2 object key from a public URL.
 * Strips the R2_PUBLIC_BASE_URL prefix, or the R2_ENDPOINT/<bucket>/ prefix.
 * Returns the raw key suitable for deleteFromR2().
 */
export function keyFromUrl(url: string): string {
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (publicBase && url.startsWith(publicBase + "/")) {
    return url.slice(publicBase.length + 1);
  }
  const endpoint = (process.env.R2_ENDPOINT ?? "").replace(/\/$/, "");
  const bucket = process.env.R2_BUCKET ?? "";
  const prefix = `${endpoint}/${bucket}/`;
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  // Fallback: treat the whole value as a raw key (caller already extracted it)
  return url;
}

/**
 * Defensive read-time URL rewriter.
 *
 * Some rows may have been saved when R2_PUBLIC_BASE_URL was not yet set — those
 * stored URLs point at the authenticated R2 endpoint (`*.r2.cloudflarestorage.com`)
 * which returns 403 to browsers. If R2_PUBLIC_BASE_URL is configured at read
 * time, rewrite endpoint URLs into public-CDN URLs so <Image> can render them.
 *
 * - If publicBase is not set, returns the URL unchanged (best we can do).
 * - If the URL is already a publicBase URL, returns it unchanged.
 * - If the URL is an endpoint URL we recognise, rewrites it to publicBase + key.
 * - Otherwise (foreign domain, e.g. images.pexels.com), returns unchanged.
 */
export function toPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  // .trim() + replace trailing slash defends against the classic "trailing
  // space in the Vercel env var" footgun. Without this, a stray space turns
  // an otherwise-valid URL into "https://pub-xxx.r2.dev%20/..." (URL-encoded
  // space) which browsers can't resolve. Also strip any trailing whitespace
  // from the stored URL itself for the same reason.
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "")
    .trim()
    .replace(/\/$/, "");
  const cleanedUrl = url.trim();
  if (!publicBase) return cleanedUrl;
  if (cleanedUrl.startsWith(publicBase + "/")) return cleanedUrl;
  const endpoint = (process.env.R2_ENDPOINT ?? "").trim().replace(/\/$/, "");
  const bucket = (process.env.R2_BUCKET ?? "").trim();
  if (endpoint && bucket) {
    const endpointPrefix = `${endpoint}/${bucket}/`;
    if (cleanedUrl.startsWith(endpointPrefix)) {
      return `${publicBase}/${cleanedUrl.slice(endpointPrefix.length)}`;
    }
  }
  return cleanedUrl;
}
