import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildGoogleAuthUrl } from "@/lib/google-calendar/oauth";

const STATE_COOKIE = "career360_gcal_oauth_state";
const RETURN_TO_COOKIE = "career360_gcal_return_to";
const STATE_COOKIE_MAX_AGE_SECONDS = 10 * 60;

// Where the callback sends the user back to once connected — only these two
// pages link the Calendar connect flow today. Validated against an allowlist
// (rather than trusted verbatim) so this can never become an open redirect.
const ALLOWED_RETURN_PATHS = ["/calendar", "/settings"];

/** Starts the Calendar connection flow — separate from NextAuth's own login provider (src/auth.ts), so existing Google sign-in is never touched. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const requestedReturnTo = request.nextUrl.searchParams.get("returnTo");
  const returnTo = ALLOWED_RETURN_PATHS.includes(requestedReturnTo ?? "") ? requestedReturnTo! : "/calendar";

  const state = randomUUID();
  const redirectUri = new URL("/api/calendar/callback", request.nextUrl.origin).toString();
  const authUrl = buildGoogleAuthUrl(redirectUri, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  response.cookies.set(RETURN_TO_COOKIE, returnTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: STATE_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return response;
}
