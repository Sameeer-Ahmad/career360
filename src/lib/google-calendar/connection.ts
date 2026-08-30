// Server-only. Owns reading/writing GoogleCalendarConnection and handing out
// a currently-valid access token. Never returns a refresh token to callers.
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
 * Upserts by userId, so a user has at most one Calendar connection at a
 * time. Pass `googleEmail` on a fresh connect; omit it on a refresh-only
 * save so the previously stored email isn't blanked out.
 */
export async function saveConnection(
  userId: string,
  tokens: GoogleTokenResponse,
  existingRefreshToken?: string,
  googleEmail?: string | null,
): Promise<void> {
  const refreshToken = tokens.refreshToken ?? existingRefreshToken;
  // Guards against ever persisting a connection with no way to refresh later.
  if (!refreshToken) throw new GoogleRefreshTokenInvalidError();

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

/** Best-effort revoke with Google, then always deletes the local row regardless of whether the revoke call succeeded. */
export async function disconnectCalendar(userId: string): Promise<void> {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { userId },
    select: { accessToken: true },
  });
  if (connection) {
    await revokeToken(connection.accessToken); // never throws — logs and swallows its own failures
  }
  await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
}

/**
 * Returns a currently-valid access token, refreshing first if expired or
 * about to expire. Throws GoogleCalendarNotConnectedError if there's no
 * connection, or if the refresh token was revoked (also deletes the
 * now-useless local row in that case).
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) throw new GoogleCalendarNotConnectedError();

  const isExpiringSoon = connection.accessTokenExpiresAt.getTime() - Date.now() < EXPIRY_BUFFER_MS;
  if (!isExpiringSoon) return connection.accessToken;

  return refreshAndPersist(userId, connection.refreshToken);
}

/** Unconditionally refreshes, bypassing the expiry-buffer check — used as a one-time retry when Calendar rejects a token our locally-stored expiry believed was still valid. */
export async function forceRefreshAccessToken(userId: string): Promise<string> {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
  if (!connection) throw new GoogleCalendarNotConnectedError();

  return refreshAndPersist(userId, connection.refreshToken);
}

async function refreshAndPersist(userId: string, refreshToken: string): Promise<string> {
  try {
    const refreshed = await refreshAccessToken(refreshToken);
    await saveConnection(userId, refreshed, refreshToken);
    return refreshed.accessToken;
  } catch (error) {
    if (error instanceof GoogleRefreshTokenInvalidError) {
      await prisma.googleCalendarConnection.deleteMany({ where: { userId } });
      throw new GoogleCalendarNotConnectedError();
    }
    throw error;
  }
}
