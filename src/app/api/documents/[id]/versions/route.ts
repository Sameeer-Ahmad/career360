import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import {
  createTailoredResume,
  listResumeVersions,
  NotFoundError,
  ValidationError,
} from "@/lib/documents/documents";
import { parseObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const id = parseObjectId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  try {
    const versions = await listResumeVersions(userId, id);
    return NextResponse.json(versions);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    throw error;
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id: idParam } = await params;
  const id = parseObjectId(idParam);
  if (id === null) {
    return NextResponse.json({ error: "Invalid document id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const version = await createTailoredResume(userId, id, body);
    return NextResponse.json(version, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    throw error;
  }
}
