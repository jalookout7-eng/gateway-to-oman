import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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

export async function uploadToR2(opts: {
  body: Buffer;
  contentType: string;
  keyPrefix: string;
  extension: string;
}): Promise<UploadResult> {
  const bucket = process.env.R2_BUCKET;
  const publicBase = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
  if (!bucket) throw new Error("R2_BUCKET not set");
  const random = randomBytes(8).toString("hex");
  const key = `${opts.keyPrefix.replace(/\/$/, "")}/${Date.now()}-${random}.${opts.extension}`;
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  );
  // NOTE: publicBase MUST be set in production (after enabling R2.dev or a custom domain).
  // The fallback URL here (endpoint+bucket+key) requires authentication — it will 403 in
  // a browser unless the bucket is made publicly accessible. See .env.example for details.
  const publicUrl = publicBase
    ? `${publicBase}/${key}`
    : `${process.env.R2_ENDPOINT}/${bucket}/${key}`;
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
