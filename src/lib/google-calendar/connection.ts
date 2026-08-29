// Server-only. Owns reading/writing GoogleCalendarConnection and handing
// out a currently-valid access token, refreshing it via oauth.ts when
// needed. Never returns a refresh token to any caller outside this module.
import { prisma } from "@/lib/prisma";
import {
  GoogleRefreshTokenInvalidError,
  refreshAccessToken,
  revokeToken,
  type GoogleTokenResponse,
} from "@/lib/google-calendar/oauth";

/** Thrown by getValidAccessToken when there is no connection at all, or the refresh token has been revoked — either way, the user must (re)connect. */
export class GoogleCalendarNotConnectedError extends Error {
  constructor() {
    super("Google Calendar is not connected.");
  }
}

// Refresh a little before actual expiry so a Calendar call never races an
// access token that's about to lapse mid-request.
const EXPIRY_BUFFER_MS = 60_000;

export async function isCalendarConnected(userId: string): Promise<boolean> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { id: true },
  });
  return connection !== null;
}

/** Connection status plus which Google account it's for — powers the Calendar workspace's account section. Never returns a token. */
export async function getConnectionSummary(userId: string): Promise<{ connected: boolean; email: string | null }> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { googleEmail: true },
  });
  return { connected: connection !== null, email: connection?.googleEmail ?? null };
}

/**
 * Upserts by userId — reconnecting (including with a different Google
 * account, after `select_account`) always overwrites this same row rather
 * than creating a second one, so a Career360 user has at most one Calendar
 * connection at a time.
 *
 * `googleEmail`: pass it on a fresh connect (the callback route looks it
 * up right after exchanging the code). Omit it on a token-refresh-only
 * save (getValidAccessToken/forceRefreshAccessToken) so the previously
 * stored email is left untouched instead of being blanked out.
 */
export async function saveConnection(
  userId: string,
  tokens: GoogleTokenResponse,
  existingRefreshToken?: string,
  googleEmail?: string | null,
): Promise<void> {
  const refreshToken = tokens.refreshToken ?? existingRefreshToken;
  if (!refreshToken) {
    // Should not happen given access_type=offline + prompt=consent on the
    // authorization request, but guards against ever persisting a
    // connection with no way to refresh later.
    throw new GoogleRefreshTokenInvalidError();
  }

  await prisma.googleCalendarConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessToken: tokens.accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
      scope: tokens.scope,
      googleEmail: googleEmail ?? null,
    },
    update: {
      accessToken: tokens.accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
      scope: tokens.scope,
      ...(googleEmail !== undefined ? { googleEmail } : {}),
    },
  });
}

/**
 * Best-effort revoke with Google, then always deletes the local row
 * regardless of whether the revoke call itself succeeded. revokeToken
 * (oauth.ts) already catches its own errors and never throws — this
 * try/catch is defense in depth so disconnecting locally can never be
 * blocked by the revoke step even if that contract were ever violated.
 */
export async function disconnectCalendar(userId: string): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { accessToken: true },
  });
  if (connection) {
    try {
      await revokeToken(connection.accessToken);
    } catch (error) {
      console.error("[google-calendar] revoke failed during disconnect (proceeding with local disconnect anyway):", error);
    }
  }
  await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
}

/**
 * Returns a currently-valid access token for this user's Calendar
 * connection, refreshing it first if it's expired or about to expire.
 * Throws GoogleCalendarNotConnectedError if there's no connection, or if
 * the refresh token turns out to have been revoked (and deletes the now-
 * useless local row in that case, so the UI correctly falls back to the
 * disconnected state without the user needing to explicitly disconnect
 * first).
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) throw new GoogleCalendarNotConnectedError();

  const isExpiringSoon = connection.accessTokenExpiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS;
  if (!isExpiringSoon) return connection.accessToken;

  try {
    const refreshed = await refreshAccessToken(connection.refreshToken);
    await saveConnection(userId, refreshed, connection.refreshToken);
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof GoogleRefreshTokenInvalidError) {
      await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
      throw new GoogleCalendarNotConnectedError();
    }
    throw error;
  }
}

/**
 * Unconditionally refreshes, bypassing the expiry-buffer check —
 * used as a one-time retry when Calendar itself rejects an access token
 * that our locally-stored expiry believed was still valid (e.g. the user
 * revoked access from their Google Account page independent of natural
 * expiry). See events.ts's withAccessToken.
 */
export async function forceRefreshAccessToken(userId: string): Promise<string> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) throw new GoogleCalendarNotConnectedError();

  try {
    const refreshed = await refreshAccessToken(connection.refreshToken);
    await saveConnection(userId, refreshed, connection.refreshToken);
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof GoogleRefreshTokenInvalidError) {
      await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
      throw new GoogleCalendarNotConnectedError();
    }
    throw error;
  }
}
