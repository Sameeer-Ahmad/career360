import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { createUserResource, getCachedResources, NotFoundError, ValidationError } from "@/lib/learning/learning-resources";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

/** Never calls YouTube — returns whatever is cached for this topic, regardless of freshness. */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning topic id" }, { status: 400 });
  }

  try {
    const result = await getCachedResources(userId, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    throw error;
  }
}

/** Creates a USER_ADDED resource — the URL is stored and opened externally; no provider is ever called. Never touches YOUTUBE/OFFICIAL_DOCS resources. */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

  try {
    const resource = await createUserResource(userId, id, body);
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    throw error;
  }
}
