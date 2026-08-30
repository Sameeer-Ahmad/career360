import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getPathNotes, NotFoundError } from "@/lib/learning/learning";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

/** Aggregated, read-only — only topics that actually have a note, one query. Topic-level note editing still goes through /api/learning/topics/[id]/notes. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning path id" }, { status: 400 });
  }

  try {
    const notes = await getPathNotes(userId, id);
    return NextResponse.json({ notes });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }
    throw error;
  }
}
