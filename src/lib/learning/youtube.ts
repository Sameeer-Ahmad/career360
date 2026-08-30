// Server-only YouTube Data API v3 client. Used exclusively by Learning
// Resources (src/lib/learning-resources.ts) to find VIDEO/PLAYLIST
// resources for a LearningTopic. YOUTUBE_API_KEY is read from the
// environment and never leaves this module; neither the key, full request
// URLs (which carry the key as a query param), nor response bodies are
// ever logged — only status/reason diagnostics are. Deliberately limited
// to four operations (video search, playlist search, batched video
// metadata, batched playlist metadata) — see learning-resources.ts for why
// channels.list and playlistItems.list are intentionally not used.

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

export class YouTubeConfigError extends Error {
  constructor() {
    super("YouTube is not configured.");
  }
}

export class YouTubeRequestError extends Error {
  constructor(message = "Resource search is temporarily unavailable. Please try again.") {
    super(message);
  }
}

/** Thrown specifically for a daily quota exhaustion (403 quotaExceeded) or a short-window rate limit (429 rateLimitExceeded) — callers may want to react differently than to a generic request failure. */
export class YouTubeQuotaError extends Error {
  constructor(message = "YouTube quota has been reached today. Please try again later.") {
    super(message);
  }
}

function getApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new YouTubeConfigError();
  }
  return apiKey;
}

type YouTubeErrorBody = {
  error?: {
    code?: number;
    message?: string;
    errors?: { reason?: string; domain?: string }[];
  };
};

function reasonFromErrorBody(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const parsed = body as YouTubeErrorBody;
  return parsed.error?.errors?.[0]?.reason;
}

const QUOTA_REASONS = new Set(["quotaExceeded", "dailyLimitExceeded", "rateLimitExceeded", "userRateLimitExceeded"]);

/**
 * Performs one GET against the YouTube Data API. Never logs the URL (it
 * carries the API key as a query param) or the response body — only the
 * endpoint name, status, and provider-supplied reason code. Throws
 * YouTubeConfigError, YouTubeQuotaError, or YouTubeRequestError — never a
 * raw fetch/provider error.
 */
async function get(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const apiKey = getApiKey();
  const url = new URL(`${YOUTUBE_API_URL}/${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("key", apiKey);

  let response: Response;
  try {
    response = await fetch(url.toString(), { method: "GET" });
  } catch (error) {
    console.error(`[youtube] network request failed (${endpoint}):`, error);
    throw new YouTubeRequestError();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    const reason = reasonFromErrorBody(body);
    console.error(`[youtube] request failed (${endpoint}):`, response.status, reason ?? "unknown reason");
    if (response.status === 403 || response.status === 429) {
      if (reason && QUOTA_REASONS.has(reason)) {
        throw new YouTubeQuotaError();
      }
    }
    throw new YouTubeRequestError();
  }

  try {
    return await response.json();
  } catch (error) {
    console.error(`[youtube] failed to parse response JSON (${endpoint}):`, error);
    throw new YouTubeRequestError();
  }
}

// ---------------------------------------------------------------------------
// search.list
// ---------------------------------------------------------------------------

export type YouTubeSearchResultItem = {
  kind: "video" | "playlist";
  id: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
};

function parseSearchItem(raw: unknown, kind: "video" | "playlist"): YouTubeSearchResultItem | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const id = item.id as Record<string, unknown> | undefined;
  const snippet = item.snippet as Record<string, unknown> | undefined;
  if (!id || !snippet) return null;

  const resourceId = kind === "video" ? id.videoId : id.playlistId;
  if (typeof resourceId !== "string" || !resourceId) return null;
  if (typeof snippet.title !== "string" || typeof snippet.channelId !== "string") return null;

  const thumbnails = snippet.thumbnails as Record<string, unknown> | undefined;
  const thumbnail = (thumbnails?.medium ?? thumbnails?.default) as Record<string, unknown> | undefined;

  return {
    kind,
    id: resourceId,
    title: snippet.title,
    description: typeof snippet.description === "string" ? snippet.description : "",
    channelId: snippet.channelId,
    channelName: typeof snippet.channelName === "string" ? snippet.channelName : (snippet.channelTitle as string) ?? "",
    thumbnailUrl: typeof thumbnail?.url === "string" ? thumbnail.url : null,
    publishedAt: typeof snippet.publishedAt === "string" ? snippet.publishedAt : null,
  };
}

async function searchByType(query: string, type: "video" | "playlist"): Promise<YouTubeSearchResultItem[]> {
  const data = await get("search", {
    part: "snippet",
    q: query,
    type,
    maxResults: "10",
    safeSearch: "strict",
  });
  const items = typeof data === "object" && data !== null ? (data as Record<string, unknown>).items : undefined;
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => parseSearchItem(item, type))
    .filter((item): item is YouTubeSearchResultItem => item !== null);
}

/** One search.list call (type=video) — the only video search issued per refresh. */
export async function searchVideos(query: string): Promise<YouTubeSearchResultItem[]> {
  return searchByType(query, "video");
}

/** One search.list call (type=playlist) — the only playlist search issued per refresh. */
export async function searchPlaylists(query: string): Promise<YouTubeSearchResultItem[]> {
  return searchByType(query, "playlist");
}

// ---------------------------------------------------------------------------
// videos.list
// ---------------------------------------------------------------------------

export type YouTubeVideoMetadata = {
  id: string;
  durationSeconds: number | null;
  viewCount: number | null;
};

function parseVideoMetadata(raw: unknown): YouTubeVideoMetadata | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== "string") return null;

  const contentDetails = item.contentDetails as Record<string, unknown> | undefined;
  const statistics = item.statistics as Record<string, unknown> | undefined;

  const rawDuration = typeof contentDetails?.duration === "string" ? contentDetails.duration : null;
  const rawViewCount = typeof statistics?.viewCount === "string" ? Number(statistics.viewCount) : null;

  return {
    id: item.id,
    durationSeconds: rawDuration ? parseIso8601Duration(rawDuration) : null,
    viewCount: rawViewCount !== null && Number.isFinite(rawViewCount) ? rawViewCount : null,
  };
}

/**
 * One batched videos.list call for up to 50 IDs (1 unit regardless of
 * count) — never one call per video. Returns an empty array for an empty
 * input without making a request.
 */
export async function getVideoMetadata(videoIds: string[]): Promise<YouTubeVideoMetadata[]> {
  if (videoIds.length === 0) return [];
  const data = await get("videos", {
    part: "contentDetails,statistics",
    id: videoIds.slice(0, 50).join(","),
  });
  const items = typeof data === "object" && data !== null ? (data as Record<string, unknown>).items : undefined;
  if (!Array.isArray(items)) return [];
  return items.map(parseVideoMetadata).filter((item): item is YouTubeVideoMetadata => item !== null);
}

// ---------------------------------------------------------------------------
// playlists.list
// ---------------------------------------------------------------------------

export type YouTubePlaylistMetadata = {
  id: string;
  itemCount: number | null;
};

function parsePlaylistMetadata(raw: unknown): YouTubePlaylistMetadata | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== "string") return null;

  const contentDetails = item.contentDetails as Record<string, unknown> | undefined;
  const itemCount = typeof contentDetails?.itemCount === "number" ? contentDetails.itemCount : null;

  return { id: item.id, itemCount };
}

/** One batched playlists.list call for up to 50 IDs (1 unit regardless of count). */
export async function getPlaylistMetadata(playlistIds: string[]): Promise<YouTubePlaylistMetadata[]> {
  if (playlistIds.length === 0) return [];
  const data = await get("playlists", {
    part: "contentDetails",
    id: playlistIds.slice(0, 50).join(","),
  });
  const items = typeof data === "object" && data !== null ? (data as Record<string, unknown>).items : undefined;
  if (!Array.isArray(items)) return [];
  return items.map(parsePlaylistMetadata).filter((item): item is YouTubePlaylistMetadata => item !== null);
}

// ---------------------------------------------------------------------------
// ISO-8601 duration parsing (exported — also used for classifying results)
// ---------------------------------------------------------------------------

const ISO_8601_DURATION_PATTERN = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;

/** Parses a YouTube contentDetails.duration string (e.g. "PT1H20M15S", "PT20M", "PT45S", "PT0S") into whole seconds. Returns null for anything malformed or unrecognized. */
export function parseIso8601Duration(value: string): number | null {
  const match = ISO_8601_DURATION_PATTERN.exec(value.trim());
  if (!match) return null;

  const [, hoursStr, minutesStr, secondsStr] = match;
  if (!hoursStr && !minutesStr && !secondsStr) return null; // "PT" alone matches but is not a real duration

  const hours = Number(hoursStr ?? 0);
  const minutes = Number(minutesStr ?? 0);
  const seconds = Number(secondsStr ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}
