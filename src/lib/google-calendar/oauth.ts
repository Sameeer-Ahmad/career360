// Server-only Google OAuth handling for the Calendar connection flow —
// entirely separate from src/auth.ts (NextAuth), which owns login. Reuses
// the same Google OAuth client (AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET). Never
// logs a code, access token, or refresh token.

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

// The narrowest scope for create/read/update/delete on the user's own
// calendars — not the broader `calendar` scope, which would also grant
// access to calendars merely shared with the user. `email` is added so the
// connection UI can show which Google account is connected.
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events.owned email";

const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export class GoogleCalendarConfigError extends Error {
  constructor() {
    super("Google Calendar is not configured.");
  }
}

export class GoogleOAuthError extends Error {
  constructor(message = "Could not connect to Google Calendar. Please try again.") {
    super(message);
  }
}

function getClientCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) throw new GoogleCalendarConfigError();
  return { clientId, clientSecret };
}

/**
 * Builds the Google consent-screen URL for the Calendar connection flow.
 * `access_type=offline` + `prompt=consent` guarantee a refresh token is
 * issued every time (Google only returns one on the very first consent
 * otherwise). `select_account` ensures reconnecting always shows the
 * account chooser rather than silently reusing the signed-in account.
 */
export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const { clientId } = getClientCredentials();
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account consent");
  url.searchParams.set("state", state);
  return url.toString();
}

/** Best-effort lookup of the connected Google account's email, for display only. Returns null on any failure rather than throwing — the connection must still succeed even if this fails. */
export async function fetchGoogleAccountEmail(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.error("[google-calendar] userinfo lookup failed:", response.status);
      return null;
    }
    const data = (await response.json()) as Record<string, unknown>;
    return typeof data.email === "string" ? data.email : null;
  } catch (error) {
    console.error("[google-calendar] userinfo lookup network failure:", error);
    return null;
  }
}

export type GoogleTokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  scope: string;
};

async function postToken(body: Record<string, string>): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...body, client_id: clientId, client_secret: clientSecret }).toString(),
    });
  } catch (error) {
    console.error("[google-calendar] token request network failure:", error);
    throw new GoogleOAuthError();
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => undefined);
    console.error("[google-calendar] token request failed:", response.status, detail?.error ?? "unknown");
    throw new GoogleOAuthError();
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error("[google-calendar] failed to parse token response:", error);
    throw new GoogleOAuthError();
  }

  const parsed = data as Record<string, unknown>;
  const accessToken = typeof parsed.access_token === "string" ? parsed.access_token : null;
  const expiresIn = typeof parsed.expires_in === "number" ? parsed.expires_in : null;
  if (!accessToken || expiresIn === null) {
    console.error("[google-calendar] token response missing expected fields");
    throw new GoogleOAuthError();
  }

  return {
    accessToken,
    refreshToken: typeof parsed.refresh_token === "string" ? parsed.refresh_token : null,
    expiresInSeconds: expiresIn,
    scope: typeof parsed.scope === "string" ? parsed.scope : GOOGLE_CALENDAR_SCOPE,
  };
}

/** Exchanges an authorization code for tokens. Google returns a refresh_token here because of access_type=offline + prompt=consent above. */
export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokenResponse> {
  return postToken({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });
}

/** Thrown specifically when a refresh attempt fails with invalid_grant — the refresh token has been revoked or expired, and the user must reconnect. Distinct from a generic/transient OAuth failure. */
export class GoogleRefreshTokenInvalidError extends Error {
  constructor() {
    super("Google Calendar access has expired. Please reconnect.");
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const { clientId, clientSecret } = getClientCredentials();

  let response: Response;
  try {
    response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }).toString(),
    });
  } catch (error) {
    console.error("[google-calendar] refresh request network failure:", error);
    throw new GoogleOAuthError();
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => undefined);
    const reason = detail?.error;
    console.error("[google-calendar] refresh request failed:", response.status, reason ?? "unknown");
    if (reason === "invalid_grant") throw new GoogleRefreshTokenInvalidError();
    throw new GoogleOAuthError();
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    console.error("[google-calendar] failed to parse refresh response:", error);
    throw new GoogleOAuthError();
  }

  const parsed = data as Record<string, unknown>;
  const accessToken = typeof parsed.access_token === "string" ? parsed.access_token : null;
  const expiresIn = typeof parsed.expires_in === "number" ? parsed.expires_in : null;
  if (!accessToken || expiresIn === null) {
    console.error("[google-calendar] refresh response missing expected fields");
    throw new GoogleOAuthError();
  }

  // A refresh response does not always include a new refresh_token —
  // Google typically keeps the original one valid, so the caller must
  // preserve the existing refreshToken when this is null.
  return {
    accessToken,
    refreshToken: typeof parsed.refresh_token === "string" ? parsed.refresh_token : null,
    expiresInSeconds: expiresIn,
    scope: typeof parsed.scope === "string" ? parsed.scope : GOOGLE_CALENDAR_SCOPE,
  };
}

/** Best-effort revoke on disconnect — failures are logged, never thrown, since the local connection is deleted regardless (see connection.ts). */
export async function revokeToken(token: string): Promise<void> {
  try {
    const url = new URL(GOOGLE_REVOKE_URL);
    url.searchParams.set("token", token);
    const response = await fetch(url.toString(), { method: "POST" });
    if (!response.ok) {
      console.error("[google-calendar] revoke request failed:", response.status);
    }
  } catch (error) {
    console.error("[google-calendar] revoke request network failure:", error);
  }
}
