import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exchangeCodeForTokens, fetchGoogleAccountEmail } from "@/lib/google-calendar/oauth";
import { saveConnection } from "@/lib/google-calendar/connection";

const STATE_COOKIE = "career360_gcal_oauth_state";
const RETURN_TO_COOKIE = "career360_gcal_return_to";
const ALLOWED_RETURN_PATHS = ["/calendar", "/settings"];

function resolveReturnTo(request: NextRequest): string {
  const returnTo = request.cookies.get(RETURN_TO_COOKIE)?.value;
  return returnTo && ALLOWED_RETURN_PATHS.includes(returnTo) ? returnTo : "/calendar";
}

function redirectWithError(request: NextRequest, reason: string) {
  const url = new URL(resolveReturnTo(request), request.nextUrl.origin);
  url.searchParams.set("error", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(RETURN_TO_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  const params = request.nextUrl.searchParams;
  const googleError = params.get("error");
  if (googleError) {
    // The user declined consent, or Google itself reported a problem —
    // never surface the raw Google error string to the client.
    console.error("[google-calendar] OAuth callback returned an error:", googleError);
    return redirectWithError(request, "denied");
  }

  const code = params.get("code");
  const returnedState = params.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return redirectWithError(request, "invalid_state");
  }

  try {
    const redirectUri = new URL("/api/calendar/callback", request.nextUrl.origin).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    // Best-effort — a failed lookup must never block the connection itself;
    // saveConnection just stores null and the account section omits the
    // email line (see fetchGoogleAccountEmail).
    const googleEmail = await fetchGoogleAccountEmail(tokens.accessToken);
    await saveConnection(session.user.id, tokens, undefined, googleEmail);
  } catch (error) {
    console.error("[google-calendar] failed to complete connection:", error);
    return redirectWithError(request, "connection_failed");
  }

  const successUrl = new URL(resolveReturnTo(request), request.nextUrl.origin);
  successUrl.searchParams.set("connected", "1");
  const response = NextResponse.redirect(successUrl);
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(RETURN_TO_COOKIE);
  return response;
}
