/**
 * Tests for the new helpers in lib/r2.ts:
 *   buildR2Key, buildPublicUrl, presignPutUrl
 *
 * @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner are mocked so no
 * real network calls happen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-s3 (same mock as upload.test.ts)
// ---------------------------------------------------------------------------
const mockSend = vi.fn().mockResolvedValue({});
vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = mockSend;
  }
  class PutObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  class DeleteObjectCommand {
    constructor(public input: Record<string, unknown>) {}
  }
  return { S3Client: MockS3Client, PutObjectCommand, DeleteObjectCommand };
});

// ---------------------------------------------------------------------------
// Mock @aws-sdk/s3-request-presigner
// ---------------------------------------------------------------------------
const mockGetSignedUrl = vi.fn().mockResolvedValue("https://signed.example/key?X-Amz-Signature=abc");
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

// ---------------------------------------------------------------------------
// Helpers (same pattern as upload.test.ts)
// ---------------------------------------------------------------------------
function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function clearR2Env() {
  delete process.env.R2_ENDPOINT;
  delete process.env.R2_BUCKET;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_PUBLIC_BASE_URL;
}

const BASE_ENV = {
  R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
  R2_BUCKET: "gto-listings",
  R2_ACCESS_KEY_ID: "key123",
  R2_SECRET_ACCESS_KEY: "secret123",
  R2_PUBLIC_BASE_URL: "https://media.gatewaytooman.com",
};

// ---------------------------------------------------------------------------
// buildR2Key
// ---------------------------------------------------------------------------
describe("lib/r2 — buildR2Key", () => {
  beforeEach(() => {
    vi.resetModules();
    clearR2Env();
  });
  afterEach(() => {
    clearR2Env();
  });

  it("produces a key with shape prefix/<epoch13>-<hex16>.<ext>", async () => {
    const { buildR2Key } = await import("@/lib/r2");
    const key = buildR2Key("listings/abc", "jpg");
    expect(key).toMatch(/^listings\/abc\/\d{13}-[0-9a-f]{16}\.jpg$/);
  });

  it("strips a trailing slash from the key prefix", async () => {
    const { buildR2Key } = await import("@/lib/r2");
    const key = buildR2Key("listings/abc/", "png");
    expect(key).not.toContain("//");
    expect(key).toMatch(/^listings\/abc\/\d{13}-[0-9a-f]{16}\.png$/);
  });

  it("generates a different random segment on each call", async () => {
    const { buildR2Key } = await import("@/lib/r2");
    const k1 = buildR2Key("listings/abc", "jpg");
    const k2 = buildR2Key("listings/abc", "jpg");
    expect(k1).not.toBe(k2);
  });
});

// ---------------------------------------------------------------------------
// buildPublicUrl
// ---------------------------------------------------------------------------
describe("lib/r2 — buildPublicUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    clearR2Env();
  });
  afterEach(() => {
    clearR2Env();
  });

  it("uses R2_PUBLIC_BASE_URL when set", async () => {
    setEnv(BASE_ENV);
    const { buildPublicUrl } = await import("@/lib/r2");
    const url = buildPublicUrl("listings/abc/1234-abcd1234abcd1234.jpg");
    expect(url).toBe("https://media.gatewaytooman.com/listings/abc/1234-abcd1234abcd1234.jpg");
  });

  it("strips trailing slash from R2_PUBLIC_BASE_URL", async () => {
    setEnv({ ...BASE_ENV, R2_PUBLIC_BASE_URL: "https://media.gatewaytooman.com/" });
    const { buildPublicUrl } = await import("@/lib/r2");
    const url = buildPublicUrl("listings/abc/1234-abcd1234abcd1234.jpg");
    expect(url).not.toContain("//listings");
    expect(url).toBe("https://media.gatewaytooman.com/listings/abc/1234-abcd1234abcd1234.jpg");
  });

  it("falls back to endpoint+bucket when R2_PUBLIC_BASE_URL is unset", async () => {
    setEnv({ ...BASE_ENV, R2_PUBLIC_BASE_URL: undefined });
    const { buildPublicUrl } = await import("@/lib/r2");
    const url = buildPublicUrl("listings/abc/1234-abcd1234abcd1234.jpg");
    expect(url).toBe(
      "https://account.r2.cloudflarestorage.com/gto-listings/listings/abc/1234-abcd1234abcd1234.jpg",
    );
  });

  it("throws when R2_BUCKET is unset", async () => {
    setEnv({ ...BASE_ENV, R2_BUCKET: undefined });
    const { buildPublicUrl } = await import("@/lib/r2");
    expect(() => buildPublicUrl("any/key.jpg")).toThrow("R2_BUCKET not set");
  });
});

// ---------------------------------------------------------------------------
// presignPutUrl
// ---------------------------------------------------------------------------
describe("lib/r2 — presignPutUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    clearR2Env();
    mockGetSignedUrl.mockClear();
  });
  afterEach(() => {
    clearR2Env();
  });

  it("returns the presigned URL from getSignedUrl", async () => {
    setEnv(BASE_ENV);
    const { presignPutUrl } = await import("@/lib/r2");
    const url = await presignPutUrl({ key: "listings/abc/test.jpg", contentType: "image/jpeg" });
    expect(url).toBe("https://signed.example/key?X-Amz-Signature=abc");
  });

  it("calls getSignedUrl with PutObjectCommand carrying correct Bucket, Key, ContentType", async () => {
    setEnv(BASE_ENV);
    const { presignPutUrl } = await import("@/lib/r2");
    await presignPutUrl({ key: "listings/abc/test.jpg", contentType: "image/jpeg" });
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
    const [, cmd, opts] = mockGetSignedUrl.mock.calls[0];
    expect(cmd.input).toMatchObject({
      Bucket: "gto-listings",
      Key: "listings/abc/test.jpg",
      ContentType: "image/jpeg",
    });
    expect(opts.expiresIn).toBe(300);
  });

  it("defaults expiresIn to 300 seconds", async () => {
    setEnv(BASE_ENV);
    const { presignPutUrl } = await import("@/lib/r2");
    await presignPutUrl({ key: "listings/abc/test.mp4", contentType: "video/mp4" });
    const [, , opts] = mockGetSignedUrl.mock.calls[0];
    expect(opts.expiresIn).toBe(300);
  });

  it("honours a custom expiresIn", async () => {
    setEnv(BASE_ENV);
    const { presignPutUrl } = await import("@/lib/r2");
    await presignPutUrl({ key: "listings/abc/test.mp4", contentType: "video/mp4", expiresIn: 600 });
    const [, , opts] = mockGetSignedUrl.mock.calls[0];
    expect(opts.expiresIn).toBe(600);
  });

  it("throws when R2_BUCKET is unset", async () => {
    setEnv({ ...BASE_ENV, R2_BUCKET: undefined });
    const { presignPutUrl } = await import("@/lib/r2");
    await expect(
      presignPutUrl({ key: "listings/abc/test.jpg", contentType: "image/jpeg" }),
    ).rejects.toThrow("R2_BUCKET not set");
  });

  it("throws when R2 credentials are missing", async () => {
    setEnv({ R2_BUCKET: "gto-listings" }); // no endpoint/access key/secret
    const { presignPutUrl } = await import("@/lib/r2");
    await expect(
      presignPutUrl({ key: "listings/abc/test.jpg", contentType: "image/jpeg" }),
    ).rejects.toThrow("R2 not configured");
  });
});
