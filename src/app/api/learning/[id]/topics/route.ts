import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { addPersonalTopic, NotFoundError, NotPersonalPathError, ValidationError } from "@/lib/learning/learning";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

/** Adds a single manually-entered topic to an existing PERSONAL path. Never calls AI — the topic set for RECOMMENDED/APPLICATION paths is managed exclusively by generation/replacement. */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning path id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const topic = await addPersonalTopic(userId, id, body);
    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning path not found" }, { status: 404 });
    }
    if (error instanceof NotPersonalPathError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
