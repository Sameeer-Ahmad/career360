import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import {
  NotFoundError,
  RefreshCooldownError,
  refreshLearningResources,
  YouTubeConfigError,
  YouTubeQuotaError,
  YouTubeRequestError,
} from "@/lib/learning/learning-resources";
import { isValidObjectId } from "@/lib/object-id";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * The only route that ever calls YouTube. Never destroys a good cached set
 * because a live call failed — refreshLearningResources itself returns the
 * old cache (with a warning) in that case, so a 200 here can mean either a
 * genuinely fresh set or a cache fallback; the client tells them apart via
 * the `warning` field. Only when there is truly no cache to fall back on
 * does this map to an error response.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  if (!isValidObjectId(id)) {
    return NextResponse.json({ error: "Invalid learning topic id" }, { status: 400 });
  }

  try {
    const result = await refreshLearningResources(userId, id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Learning topic not found" }, { status: 404 });
    }
    if (error instanceof RefreshCooldownError) {
      return NextResponse.json(
        { error: "Please wait before refreshing resources again.", retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 },
      );
    }
    if (error instanceof YouTubeQuotaError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof YouTubeConfigError) {
      return NextResponse.json({ error: "Learning resources are temporarily unavailable." }, { status: 503 });
    }
    if (error instanceof YouTubeRequestError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
