import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getConnectionSummary } from "@/lib/google-calendar/connection";

/** A local DB lookup only — never calls Google. Cheap enough to call on every Calendar page load. Never returns a token — email is display-only. */
export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { connected, email } = await getConnectionSummary(userId);
  return NextResponse.json({ connected, email });
}
