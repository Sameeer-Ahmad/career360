import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getPathResources, NotFoundError } from "@/lib/learning/learning";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

/** Aggregated, read-only — every topic's resources in one query, grouped by topic. Never calls YouTube. Mutations still go through /api/learning/topics/[id]/resources. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning path id" }, { status: 400 });
  }

  try {
    const topics = await getPathResources(userId, id);
    return NextResponse.json({ topics });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }
    throw error;
  }
}
