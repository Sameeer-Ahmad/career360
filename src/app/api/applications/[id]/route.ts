import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import {
  deleteApplication,
  getApplication,
  NotFoundError,
  updateApplication,
  ValidationError,
} from "@/lib/applications/applications";
import { parseObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const id = parseObjectId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  try {
    const application = await getApplication(userId, id);
    return NextResponse.json(application);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const id = parseObjectId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const application = await updateApplication(userId, id, body);
    return NextResponse.json(application);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    throw error;
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const id = parseObjectId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid application id" }, { status: 400 });
  }

  try {
    await deleteApplication(userId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    throw error;
  }
}
