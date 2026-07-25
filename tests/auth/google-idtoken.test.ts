// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";
import { SignJWT, generateKeyPair, createLocalJWKSet, exportJWK, type JWTVerifyGetKey } from "jose";
import { verifyGoogleIdToken } from "@/lib/auth/google";

// Real-crypto test: sign tokens with a locally generated RSA key and hand the
// route the matching local JWKS — no network, no mocks of jose itself.
let jwks: JWTVerifyGetKey;
let privateKey: CryptoKey;
let strangerKey: CryptoKey;

const CLIENT_ID = "test-client-id.apps.googleusercontent.com";

async function signToken(opts: {
  key?: CryptoKey;
  iss?: string;
  aud?: string;
  expired?: boolean;
  payload?: Record<string, unknown>;
}): Promise<string> {
  const jwt = new SignJWT({
    email: "person@example.com",
    email_verified: true,
    name: "Test Person",
    ...(opts.payload ?? {}),
  })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setSubject("google-sub-123")
    .setIssuer(opts.iss ?? "https://accounts.google.com")
    .setAudience(opts.aud ?? CLIENT_ID)
    .setIssuedAt();
  if (opts.expired) {
    jwt.setExpirationTime(Math.floor(Date.now() / 1000) - 3600);
  } else {
    jwt.setExpirationTime("1h");
  }
  return jwt.sign(opts.key ?? privateKey);
}

beforeAll(async () => {
  process.env.GOOGLE_CLIENT_ID = CLIENT_ID;
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey as CryptoKey;
  const strangerPair = await generateKeyPair("RS256");
  strangerKey = strangerPair.privateKey as CryptoKey;
  const publicJwk = await exportJWK(pair.publicKey);
  publicJwk.kid = "test-key";
  publicJwk.alg = "RS256";
  jwks = createLocalJWKSet({ keys: [publicJwk] });
});

describe("verifyGoogleIdToken (A08-1)", () => {
  it("accepts a correctly signed token and maps the identity", async () => {
    const token = await signToken({});
    const identity = await verifyGoogleIdToken(token, jwks);
    expect(identity).toEqual({
      email: "person@example.com",
      name: "Test Person",
      sub: "google-sub-123",
      email_verified: true,
    });
  });

  it("accepts the bare 'accounts.google.com' issuer form", async () => {
    const token = await signToken({ iss: "accounts.google.com" });
    expect(await verifyGoogleIdToken(token, jwks)).not.toBeNull();
  });

  it("rejects a token signed by a different key", async () => {
    const token = await signToken({ key: strangerKey });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects a wrong audience", async () => {
    const token = await signToken({ aud: "someone-else.apps.googleusercontent.com" });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects a wrong issuer", async () => {
    const token = await signToken({ iss: "https://evil.example.com" });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signToken({ expired: true });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("rejects garbage input", async () => {
    expect(await verifyGoogleIdToken("not-a-jwt", jwks)).toBeNull();
  });

  it("returns null when the payload is missing email or sub", async () => {
    const token = await signToken({ payload: { email: undefined } });
    expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
  });

  it("fails closed when GOOGLE_CLIENT_ID is unset, even for an otherwise-valid token", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    try {
      const token = await signToken({});
      expect(await verifyGoogleIdToken(token, jwks)).toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
