import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { deleteAccount } from "@/lib/account/account";
import { signOut } from "@/auth";

/** Deletes the account, then clears the session cookie so the browser can't keep acting as a now-deleted user — the client redirects to /login once this resolves. */
export async function DELETE() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  await deleteAccount(userId);
  await signOut({ redirect: false });
  return NextResponse.json({ ok: true });
}
