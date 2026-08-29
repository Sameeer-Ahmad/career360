import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { disconnectCalendar } from "@/lib/google-calendar/connection";

export async function POST() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  await disconnectCalendar(userId);
  return NextResponse.json({ connected: false });
}
