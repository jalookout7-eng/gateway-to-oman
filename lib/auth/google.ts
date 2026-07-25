import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

export const GOOGLE_STATE_COOKIE = "gto_google_oauth_state";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const CALLBACK_PATH = "/api/businesses/google/callback";

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** The redirect URI registered in the Google Cloud console, derived per-origin. */
export function googleRedirectUri(requestUrl: string): string {
  return new URL(CALLBACK_PATH, requestUrl).toString();
}

/** Build the Google consent-screen URL the user is sent to. */
export function buildGoogleAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`;
}

export type GoogleIdentity = {
  email: string;
  name: string;
  sub: string;
  email_verified: boolean;
};

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Google issues both forms; both are legitimate.
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let remoteJwks: JWTVerifyGetKey | null = null;
function googleJwks(): JWTVerifyGetKey {
  if (!remoteJwks) remoteJwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return remoteJwks;
}

/**
 * Verify a Google id_token's signature against Google's JWKS and check
 * iss / aud / exp (A08-1 — replaces the decode-only path). The jwks
 * parameter exists as a test seam; production callers use the default.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  jwks: JWTVerifyGetKey = googleJwks(),
): Promise<GoogleIdentity | null> {
  // jose treats a falsy `audience` option as "skip the audience check" — never
  // pass it an empty string, or a misconfigured deployment (GOOGLE_CLIENT_ID
  // unset) would accept a validly-signed Google token issued for ANY client.
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) return null;
  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: GOOGLE_ISSUERS,
      audience,
      algorithms: ["RS256"],
    });
    if (!payload.email || !payload.sub) return null;
    return {
      email: String(payload.email),
      name: String(payload.name ?? ""),
      sub: String(payload.sub),
      email_verified: payload.email_verified === true || payload.email_verified === "true",
    };
  } catch {
    return null;
  }
}

/** Exchange an authorization code for tokens. Returns the raw token response. */
export async function exchangeGoogleCode(opts: {
  code: string;
  redirectUri: string;
}): Promise<{ id_token?: string; access_token?: string } | null> {
  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  return res.json();
}
