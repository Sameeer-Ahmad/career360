import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getNote, NotFoundError, saveNote } from "@/lib/learning/learning-notes";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning topic id" }, { status: 400 });
  }

  try {
    const note = await getNote(userId, id);
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    throw error;
  }
}

/** Upsert — empty/whitespace-only content deletes the note. No POST/DELETE: one note per topic, this single idempotent route covers create, update, and clear. */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning topic id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown> | null;
  const content = typeof raw?.content === "string" ? raw.content : null;
  if (content === null) {
    return NextResponse.json({ error: "content must be a string" }, { status: 400 });
  }

  try {
    const note = await saveNote(userId, id, content);
    return NextResponse.json({ note });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    throw error;
  }
}
