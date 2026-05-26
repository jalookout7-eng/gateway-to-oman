/**
 * Tests for lib/r2.ts
 *
 * The S3Client is mocked so no real network calls happen.
 * We verify key construction, publicUrl assembly, and env-var validation.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-s3
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
// Helper: isolate the module between tests by resetting the singleton
// We re-import each time so the module-level `client` is reset.
// ---------------------------------------------------------------------------

function setEnv(overrides: Record<string, string | undefined>) {
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = v;
    }
  }
}

function clearR2Env() {
  delete process.env.R2_ENDPOINT;
  delete process.env.R2_BUCKET;
  delete process.env.R2_ACCESS_KEY_ID;
  delete process.env.R2_SECRET_ACCESS_KEY;
  delete process.env.R2_PUBLIC_BASE_URL;
}

describe("lib/r2 — uploadToR2", () => {
  beforeEach(() => {
    vi.resetModules();
    clearR2Env();
    mockSend.mockClear();
  });

  afterEach(() => {
    clearR2Env();
  });

  it("constructs a key with the shape keyPrefix/<timestamp>-<random>.<ext>", async () => {
    setEnv({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "gto-listings",
      R2_ACCESS_KEY_ID: "key123",
      R2_SECRET_ACCESS_KEY: "secret123",
      R2_PUBLIC_BASE_URL: "https://pub.r2.dev",
    });

    const { uploadToR2 } = await import("@/lib/r2");
    const result = await uploadToR2({
      body: Buffer.from("img-data"),
      contentType: "image/jpeg",
      keyPrefix: "listings/abc",
      extension: "jpg",
    });

    // key shape: listings/abc/<epoch>-<16hex>.jpg
    expect(result.key).toMatch(/^listings\/abc\/\d{13}-[0-9a-f]{16}\.jpg$/);
  });

  it("returns publicUrl built from R2_PUBLIC_BASE_URL when set", async () => {
    setEnv({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "gto-listings",
      R2_ACCESS_KEY_ID: "key123",
      R2_SECRET_ACCESS_KEY: "secret123",
      R2_PUBLIC_BASE_URL: "https://media.gatewaytooman.com",
    });

    const { uploadToR2 } = await import("@/lib/r2");
    const result = await uploadToR2({
      body: Buffer.from("img-data"),
      contentType: "image/jpeg",
      keyPrefix: "listings/xyz",
      extension: "jpg",
    });

    expect(result.publicUrl).toMatch(/^https:\/\/media\.gatewaytooman\.com\/listings\/xyz\//);
    expect(result.publicUrl).toBe(`https://media.gatewaytooman.com/${result.key}`);
  });

  it("falls back to endpoint+bucket+key when R2_PUBLIC_BASE_URL is unset", async () => {
    setEnv({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "gto-listings",
      R2_ACCESS_KEY_ID: "key123",
      R2_SECRET_ACCESS_KEY: "secret123",
      // R2_PUBLIC_BASE_URL intentionally unset
    });

    const { uploadToR2 } = await import("@/lib/r2");
    const result = await uploadToR2({
      body: Buffer.from("img-data"),
      contentType: "image/webp",
      keyPrefix: "listings/abc",
      extension: "webp",
    });

    expect(result.publicUrl).toBe(
      `https://account.r2.cloudflarestorage.com/gto-listings/${result.key}`,
    );
  });

  it("throws a clear error when R2_ENDPOINT is missing", async () => {
    setEnv({
      // R2_ENDPOINT missing
      R2_BUCKET: "gto-listings",
      R2_ACCESS_KEY_ID: "key123",
      R2_SECRET_ACCESS_KEY: "secret123",
    });

    const { uploadToR2 } = await import("@/lib/r2");
    await expect(
      uploadToR2({
        body: Buffer.from("data"),
        contentType: "image/jpeg",
        keyPrefix: "listings/test",
        extension: "jpg",
      }),
    ).rejects.toThrow("R2 not configured");
  });

  it("throws a clear error when R2_BUCKET is missing", async () => {
    setEnv({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      // R2_BUCKET missing
      R2_ACCESS_KEY_ID: "key123",
      R2_SECRET_ACCESS_KEY: "secret123",
    });

    const { uploadToR2 } = await import("@/lib/r2");
    await expect(
      uploadToR2({
        body: Buffer.from("data"),
        contentType: "image/jpeg",
        keyPrefix: "listings/test",
        extension: "jpg",
      }),
    ).rejects.toThrow("R2_BUCKET not set");
  });

  it("strips trailing slash from R2_PUBLIC_BASE_URL before building publicUrl", async () => {
    setEnv({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "gto-listings",
      R2_ACCESS_KEY_ID: "key123",
      R2_SECRET_ACCESS_KEY: "secret123",
      R2_PUBLIC_BASE_URL: "https://media.gatewaytooman.com/", // trailing slash
    });

    const { uploadToR2 } = await import("@/lib/r2");
    const result = await uploadToR2({
      body: Buffer.from("img-data"),
      contentType: "image/png",
      keyPrefix: "listings/abc",
      extension: "png",
    });

    // Should not produce double slashes
    expect(result.publicUrl).not.toContain("//listings");
    expect(result.publicUrl).toBe(`https://media.gatewaytooman.com/${result.key}`);
  });
});

describe("lib/r2 — keyFromUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    clearR2Env();
  });

  afterEach(() => {
    clearR2Env();
  });

  it("strips R2_PUBLIC_BASE_URL prefix to return the object key", async () => {
    setEnv({
      R2_PUBLIC_BASE_URL: "https://media.gatewaytooman.com",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "gto-listings",
    });

    const { keyFromUrl } = await import("@/lib/r2");
    const key = keyFromUrl("https://media.gatewaytooman.com/listings/abc/1234-abcd1234abcd1234.jpg");
    expect(key).toBe("listings/abc/1234-abcd1234abcd1234.jpg");
  });

  it("strips endpoint+bucket prefix when R2_PUBLIC_BASE_URL is unset", async () => {
    setEnv({
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_BUCKET: "gto-listings",
    });

    const { keyFromUrl } = await import("@/lib/r2");
    const key = keyFromUrl(
      "https://account.r2.cloudflarestorage.com/gto-listings/listings/abc/1234-abcd1234abcd1234.png",
    );
    expect(key).toBe("listings/abc/1234-abcd1234abcd1234.png");
  });
});
