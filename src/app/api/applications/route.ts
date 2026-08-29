import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import { createApplication, listApplications, ValidationError } from "@/lib/applications/applications";

/**
 * `?q=` reuses the exact same job-title/company-name search
 * ApplicationsFilterBar already drives via listApplications — no new query
 * logic. Omitting it (existing callers, e.g. the Learning workspace's
 * application picker) keeps today's "return everything" behavior exactly.
 */
export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const q = request.nextUrl.searchParams.get("q")?.trim() || undefined;
  const applications = await listApplications(userId, q ? { q } : {});
  return NextResponse.json(applications);
}

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
    const application = await createApplication(userId, body);
    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: "Invalid input", issues: error.issues }, { status: 400 });
    }
    throw error;
  }
}
