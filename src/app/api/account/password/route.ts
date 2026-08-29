import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { changePassword, GoogleAccountPasswordError, IncorrectPasswordError, ValidationError } from "@/lib/account/account";

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    await changePassword(userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    if (error instanceof IncorrectPasswordError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof GoogleAccountPasswordError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
