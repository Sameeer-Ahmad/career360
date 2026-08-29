import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import {
  deleteUserResource,
  NotEditableError,
  NotFoundError,
  ResourceNotFoundError,
  updateUserResource,
  ValidationError,
} from "@/lib/learning/learning-resources";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string; resourceId: string }> };

/** Edits a USER_ADDED resource only — a curated YOUTUBE/OFFICIAL_DOCS resource can never be mutated through this route. */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id, resourceId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(resourceId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const resource = await updateUserResource(userId, id, resourceId, body);
    return NextResponse.json(resource);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (error instanceof NotEditableError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

/** Deletes a USER_ADDED resource only — a curated YOUTUBE/OFFICIAL_DOCS resource can never be deleted this way. */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id, resourceId } = await params;
  if (!isValidObjectId(id) || !isValidObjectId(resourceId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await deleteUserResource(userId, id, resourceId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: "Resource not found" }, { status: 404 });
    }
    if (error instanceof NotEditableError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
