import { NextResponse } from "next/server";
import { auth } from "@/auth";

/** Returns the signed-in user's id, or a 401 response to return as-is when there's no session — callers check `instanceof NextResponse`. */
export async function requireUserId(): Promise<string | NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session.user.id;
}
