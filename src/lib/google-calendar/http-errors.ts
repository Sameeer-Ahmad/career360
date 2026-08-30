// Shared error->HTTP mapping for every /api/calendar/* route — never
// surfaces a raw Google API error to the client.
import { NextResponse } from "next/server";
import {
  GoogleCalendarEventNotFoundError,
  GoogleCalendarInvalidEventError,
  GoogleCalendarNotConnectedError,
  GoogleCalendarPermissionError,
  GoogleCalendarRateLimitError,
  GoogleCalendarRequestError,
} from "@/lib/google-calendar/events";

/** Returns a NextResponse if `error` is a recognized Google Calendar domain error, or null so the caller can rethrow anything else (a genuine bug) rather than silently swallowing it. */
export function mapGoogleCalendarError(error: unknown): NextResponse | null {
  if (error instanceof GoogleCalendarNotConnectedError) {
    return NextResponse.json({ error: "Google Calendar is not connected.", reconnectRequired: true }, { status: 409 });
  }
  if (error instanceof GoogleCalendarEventNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof GoogleCalendarPermissionError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
  if (error instanceof GoogleCalendarRateLimitError) {
    return NextResponse.json({ error: error.message }, { status: 429 });
  }
  if (error instanceof GoogleCalendarInvalidEventError) {
    return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
  }
  if (error instanceof GoogleCalendarRequestError) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return null;
}
