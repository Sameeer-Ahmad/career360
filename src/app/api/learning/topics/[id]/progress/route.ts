import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { getProgress, NotFoundError, PROGRESS_STATUSES, setProgress, ValidationError } from "@/lib/learning/learning-progress";
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
    const progress = await getProgress(userId, id);
    return NextResponse.json(progress);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    throw error;
  }
}

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

  const status = (body as Record<string, unknown>)?.status;
  if (typeof status !== "string" || !(PROGRESS_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: `status must be one of ${PROGRESS_STATUSES.join(", ")}` }, { status: 400 });
  }

  try {
    const progress = await setProgress(userId, id, status as (typeof PROGRESS_STATUSES)[number]);
    return NextResponse.json(progress);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
