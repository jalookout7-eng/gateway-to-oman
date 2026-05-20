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

/** Decode the (already-trusted, freshly-exchanged) id_token payload. */
export function decodeIdToken(idToken: string): GoogleIdentity | null {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
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
