import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import {
  ApplicationNotFoundError,
  createLearningPath,
  LEARNING_PATH_SOURCES,
  listLearningPaths,
  ValidationError,
  validateSaveInput,
  type LearningPathListFilters,
} from "@/lib/learning/learning";
import { isValidObjectId } from "@/lib/object-id";

function parseFilters(searchParams: URLSearchParams): LearningPathListFilters {
  const source = searchParams.get("source");
  const applicationId = searchParams.get("applicationId");
  return {
    source: source && (LEARNING_PATH_SOURCES as readonly string[]).includes(source)
      ? (source as LearningPathListFilters["source"])
      : undefined,
    applicationId: applicationId && isValidObjectId(applicationId) ? applicationId : undefined,
  };
}

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const filters = parseFilters(request.nextUrl.searchParams);
  const paths = await listLearningPaths(userId, filters);
  return NextResponse.json(paths);
}

/**
 * Saves a learning path — either a reviewed AI-generated preview (source
 * APPLICATION or RECOMMENDED) or a manually-created path with no AI
 * involvement (source PERSONAL). The body is fully re-validated here
 * regardless of where it came from — a client-submitted "preview" is never
 * trusted as already-safe just because /generate produced something that
 * looked like it earlier.
 */
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const input = validateSaveInput(body);
    const path = await createLearningPath(userId, input);
    return NextResponse.json(path, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    if (error instanceof ApplicationNotFoundError) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    throw error;
  }
}
