import { describe, it, expect, vi, afterEach } from "vitest";
import {
  buildGoogleAuthUrl,
  decodeIdToken,
  googleRedirectUri,
  googleConfigured,
} from "@/lib/auth/google";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("buildGoogleAuthUrl", () => {
  const url = buildGoogleAuthUrl({
    clientId: "abc.apps.googleusercontent.com",
    redirectUri: "https://gateway-to-oman.vercel.app/api/businesses/google/callback",
    state: "xyz123",
  });
  const parsed = new URL(url);

  it("points at Google's auth endpoint", () => {
    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
  });

  it("carries the client id, redirect, scope and state", () => {
    expect(parsed.searchParams.get("client_id")).toBe("abc.apps.googleusercontent.com");
    expect(parsed.searchParams.get("redirect_uri")).toBe(
      "https://gateway-to-oman.vercel.app/api/businesses/google/callback",
    );
    expect(parsed.searchParams.get("scope")).toBe("openid email profile");
    expect(parsed.searchParams.get("state")).toBe("xyz123");
    expect(parsed.searchParams.get("response_type")).toBe("code");
  });
});

describe("googleRedirectUri", () => {
  it("derives the callback path from the request origin", () => {
    expect(googleRedirectUri("http://localhost:3000/api/businesses/google/start")).toBe(
      "http://localhost:3000/api/businesses/google/callback",
    );
  });
});

describe("decodeIdToken", () => {
  function makeJwt(payload: object): string {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return `header.${body}.signature`;
  }

  it("decodes a valid id_token payload", () => {
    const jwt = makeJwt({ email: "buyer@example.com", name: "A Buyer", sub: "9988", email_verified: true });
    expect(decodeIdToken(jwt)).toEqual({
      email: "buyer@example.com",
      name: "A Buyer",
      sub: "9988",
      email_verified: true,
    });
  });

  it("returns null for a malformed token", () => {
    expect(decodeIdToken("not-a-jwt")).toBeNull();
  });

  it("returns null when email or sub is missing", () => {
    expect(decodeIdToken(makeJwt({ name: "No Email", sub: "1" }))).toBeNull();
    expect(decodeIdToken(makeJwt({ email: "x@y.com", name: "No Sub" }))).toBeNull();
  });
});

describe("googleConfigured", () => {
  it("is true only when both client id and secret are set", () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
    expect(googleConfigured()).toBe(true);

    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    expect(googleConfigured()).toBe(false);
  });
});
