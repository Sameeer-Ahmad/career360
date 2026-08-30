import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { deleteLearningPath, getLearningPathDetail, NotFoundError } from "@/lib/learning/learning";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning path id" }, { status: 400 });
  }

  try {
    const path = await getLearningPathDetail(userId, id);
    return NextResponse.json(path);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning path id" }, { status: 400 });
  }

  try {
    await deleteLearningPath(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }
    throw error;
  }
}
