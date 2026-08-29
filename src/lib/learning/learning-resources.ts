import { LearningResourceType, type LearningResourceProvider, type ResourceDiscoveryMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getPlaylistMetadata,
  getVideoMetadata,
  parseIso8601Duration,
  searchPlaylists,
  searchVideos,
  YouTubeConfigError,
  YouTubeQuotaError,
  YouTubeRequestError,
  type YouTubeSearchResultItem,
} from "@/lib/learning/youtube";
import { isOfficialChannel } from "@/lib/learning/learning-resources/official-channels";
import { matchOfficialDocs } from "@/lib/learning/learning-resources/official-docs";
import {
  dedupeStrings,
  documentationWhyRecommended,
  itemCountBonus,
  matchTerms,
  playlistWhyRecommended,
  recencyFactor,
  relevanceRatio,
  scorePlaylist,
  scoreVideo,
  tokenize,
  videoWhyRecommended,
  viewScore,
} from "@/lib/learning/learning-resource-scoring";

export { YouTubeConfigError, YouTubeQuotaError, YouTubeRequestError, parseIso8601Duration };
export {
  dedupeStrings,
  documentationWhyRecommended,
  itemCountBonus,
  matchTerms,
  playlistWhyRecommended,
  RANKING_WEIGHTS,
  recencyFactor,
  relevanceRatio,
  scorePlaylist,
  scoreVideo,
  tokenize,
  videoWhyRecommended,
  viewScore,
} from "@/lib/learning/learning-resource-scoring";
export {
  createUserResource,
  deleteUserResource,
  isSafeResourceUrl,
  LEARNING_RESOURCE_TYPES,
  NotEditableError,
  ResourceNotFoundError,
  updateUserResource,
  validateUserResourceInput,
  type UserResourceInput,
} from "@/lib/learning/learning-user-resources";

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Thrown for both "no such LearningTopic" and "belongs to someone else" — existence is never leaked, matching every other ownership check in this codebase. */
export class NotFoundError extends Error {
  constructor() {
    super("Learning topic not found");
  }
}

/** Thrown by refreshLearningResources when a refresh was requested too soon after the last one and no cached resources exist to fall back on (a caller with cache falls back silently instead — see refreshLearningResources). */
export class RefreshCooldownError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super("Please wait before refreshing resources again.");
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class ValidationError extends Error {
  issues: string[];
  constructor(issues: string[]) {
    super("Invalid resource input");
    this.issues = issues;
  }
}

// ---------------------------------------------------------------------------
// Constants (centralized so ranking/limits/timing can be tuned later)
// ---------------------------------------------------------------------------

const STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000; // 30-day soft staleness threshold — informational only, never triggers a refetch
const REFRESH_COOLDOWN_MS = 60 * 1000; // ~60s — guards against accidental repeated-click quota burn, unrelated to staleness

const MIN_VIDEO_DURATION_SECONDS = 90; // drops obvious Shorts before ranking, no extra YouTube request needed

const MAX_VIDEOS = 3;
const MAX_PLAYLISTS = 1;
const MAX_DOCS = 2;

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

/**
 * Verifies the LearningTopic → LearningPath → userId ownership chain and
 * returns the minimal fields generation needs. Throws NotFoundError for
 * both "doesn't exist" and "belongs to someone else." Exported for
 * learning-user-resources.ts, which performs the same ownership check
 * before mutating a user-added resource.
 */
export async function getOwnedTopic(userId: string, topicId: string): Promise<{ id: string; topic: string }> {
  const topic = await prisma.learningTopic.findFirst({
    where: { id: topicId, learningPath: { userId } },
    select: { id: true, topic: true },
  });
  if (!topic) throw new NotFoundError();
  return topic;
}

// ---------------------------------------------------------------------------
// Query generation
// ---------------------------------------------------------------------------

/** The exact query used for both search.list calls — the topic string itself, no variants, no Groq involvement. */
export function buildResourceQuery(topicText: string): string {
  return topicText.trim();
}

// ---------------------------------------------------------------------------
// Building a resource set (query -> search -> metadata -> rank -> filter -> cap)
// ---------------------------------------------------------------------------

export type ResourceRow = {
  learningTopicId: string;
  type: LearningResourceType;
  provider: LearningResourceProvider;
  discoveryMethod: ResourceDiscoveryMethod;
  title: string;
  whyRecommended: string;
  url: string;
  thumbnailUrl: string | null;
  providerResourceId: string;
  channelName: string | null;
  channelId: string | null;
  durationSeconds: number | null;
  itemCount: number | null;
  publishedAt: Date | null;
  viewCount: number | null;
  isOfficial: boolean;
  relevanceScore: number;
};

function dedupeById(items: YouTubeSearchResultItem[]): YouTubeSearchResultItem[] {
  const seen = new Set<string>();
  const result: YouTubeSearchResultItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

/**
 * Runs exactly two search.list calls (one video, one playlist — never more,
 * never Groq-generated variants), one batched videos.list call, and one
 * batched playlists.list call (skipped entirely when there are no
 * candidate IDs), then ranks/filters/caps the results and matches curated
 * documentation. Never touches the database — the caller (
 * refreshLearningResources) is responsible for persistence, and only after
 * this has fully succeeded.
 */
async function buildResourceSet(topicId: string, topicText: string): Promise<ResourceRow[]> {
  const query = buildResourceQuery(topicText);
  const topicTokens = dedupeStrings(tokenize(topicText));

  const [videoResults, playlistResults] = await Promise.all([searchVideos(query), searchPlaylists(query)]);
  const videos = dedupeById(videoResults);
  const playlists = dedupeById(playlistResults);

  const [videoMeta, playlistMeta] = await Promise.all([
    getVideoMetadata(videos.map((v) => v.id)),
    getPlaylistMetadata(playlists.map((p) => p.id)),
  ]);
  const videoMetaById = new Map(videoMeta.map((m) => [m.id, m]));
  const playlistMetaById = new Map(playlistMeta.map((m) => [m.id, m]));

  const rankedVideos = videos
    .map((item): ResourceRow | null => {
      const meta = videoMetaById.get(item.id);
      const duration = meta?.durationSeconds ?? null;
      if (duration !== null && duration < MIN_VIDEO_DURATION_SECONDS) return null; // drop obvious Shorts

      const combinedText = `${item.title} ${item.description}`;
      const matched = matchTerms(combinedText, topicTokens);
      const isOfficial = isOfficialChannel(item.channelId);
      const score = scoreVideo({
        titleRelevance: relevanceRatio(item.title, topicTokens),
        descriptionRelevance: relevanceRatio(item.description, topicTokens),
        isOfficial,
        recency: recencyFactor(item.publishedAt),
        views: viewScore(meta?.viewCount ?? null),
        durationSeconds: duration,
      });

      return {
        learningTopicId: topicId,
        type: "VIDEO",
        provider: "YOUTUBE",
        discoveryMethod: "SEARCH",
        title: item.title,
        whyRecommended: videoWhyRecommended(matched, topicText),
        url: `https://www.youtube.com/watch?v=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        providerResourceId: item.id,
        channelName: item.channelName || null,
        channelId: item.channelId || null,
        durationSeconds: duration,
        itemCount: null,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        viewCount: meta?.viewCount ?? null,
        isOfficial,
        relevanceScore: score,
      };
    })
    .filter((row): row is ResourceRow => row !== null)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_VIDEOS);

  const rankedPlaylists = playlists
    .map((item): ResourceRow => {
      const meta = playlistMetaById.get(item.id);
      const isOfficial = isOfficialChannel(item.channelId);
      const score = scorePlaylist({
        titleRelevance: relevanceRatio(item.title, topicTokens),
        descriptionRelevance: relevanceRatio(item.description, topicTokens),
        isOfficial,
        itemCountBonus: itemCountBonus(meta?.itemCount ?? null),
      });

      return {
        learningTopicId: topicId,
        type: "PLAYLIST",
        provider: "YOUTUBE",
        discoveryMethod: "SEARCH",
        title: item.title,
        whyRecommended: playlistWhyRecommended(topicText),
        url: `https://www.youtube.com/playlist?list=${item.id}`,
        thumbnailUrl: item.thumbnailUrl,
        providerResourceId: item.id,
        channelName: item.channelName || null,
        channelId: item.channelId || null,
        durationSeconds: null,
        itemCount: meta?.itemCount ?? null,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        viewCount: null,
        isOfficial,
        relevanceScore: score,
      };
    })
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_PLAYLISTS);

  const docs: ResourceRow[] = matchOfficialDocs(topicText, MAX_DOCS).map((entry) => ({
    learningTopicId: topicId,
    type: "DOCUMENTATION",
    provider: "OFFICIAL_DOCS",
    discoveryMethod: "CURATED",
    title: entry.title,
    whyRecommended: documentationWhyRecommended(entry.title),
    url: entry.url,
    thumbnailUrl: null,
    providerResourceId: entry.key,
    channelName: null,
    channelId: null,
    durationSeconds: null,
    itemCount: null,
    publishedAt: null,
    viewCount: null,
    isOfficial: true,
    relevanceScore: 1,
  }));

  return [...docs, ...rankedVideos, ...rankedPlaylists];
}

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

function computeFetchedAt(rows: { createdAt: Date }[]): Date | null {
  if (rows.length === 0) return null;
  return rows.reduce((max, row) => (row.createdAt > max ? row.createdAt : max), rows[0].createdAt);
}

export function isStale(fetchedAt: Date | null): boolean {
  if (!fetchedAt) return false;
  return Date.now() - fetchedAt.getTime() > STALE_AFTER_MS;
}

async function getResourceRows(topicId: string) {
  return prisma.learningResource.findMany({
    where: { learningTopicId: topicId },
    orderBy: { relevanceScore: "desc" },
  });
}

/** Freshness/cooldown are about the YouTube-search cache specifically — a user manually adding their own resource must never bump "fetched at" or trigger the refresh cooldown. */
function discoveredRows<T extends { discoveryMethod: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.discoveryMethod !== "USER_ADDED");
}

// ---------------------------------------------------------------------------
// Public: cache read (never calls YouTube)
// ---------------------------------------------------------------------------

export type CachedResourcesResult = {
  resources: Awaited<ReturnType<typeof getResourceRows>>;
  fetchedAt: Date | null;
  stale: boolean;
};

/** Ownership-checked. Reads whatever is cached (YouTube/documentation AND user-added, together) — never calls YouTube, regardless of freshness. `fetchedAt`/`stale` reflect only the YouTube-search cache, not user-added resources. */
export async function getCachedResources(userId: string, topicId: string): Promise<CachedResourcesResult> {
  await getOwnedTopic(userId, topicId);
  const resources = await getResourceRows(topicId);
  const fetchedAt = computeFetchedAt(discoveredRows(resources));
  return { resources, fetchedAt, stale: isStale(fetchedAt) };
}

// ---------------------------------------------------------------------------
// Public: refresh (the only path that ever calls YouTube)
// ---------------------------------------------------------------------------

export type RefreshResourcesResult = CachedResourcesResult & { warning: string | null };

function warningMessageFor(error: unknown): string {
  if (error instanceof YouTubeQuotaError) {
    return "YouTube quota has been reached today. Showing previously cached resources.";
  }
  if (error instanceof YouTubeConfigError) {
    return "Learning resources are temporarily unavailable. Showing previously cached resources.";
  }
  return "Unable to refresh resources right now. Showing previously cached resources.";
}

/**
 * Ownership-checked, cooldown-checked, then calls YouTube and replaces the
 * topic's full resource set atomically (delete-then-recreate — never an
 * individual upsert, matching the same pattern replaceExistingRecommendedPath
 * and deleteLearningPath already use elsewhere in this codebase).
 *
 * On a YouTube-layer failure: if cached resources already exist, they are
 * returned unchanged with a `warning` — good cached data is never discarded
 * because a live call failed. Only when there is truly nothing cached does
 * the original error propagate, for the caller to map to a friendly
 * response.
 */
export async function refreshLearningResources(userId: string, topicId: string): Promise<RefreshResourcesResult> {
  const topic = await getOwnedTopic(userId, topicId);

  const existingRows = await getResourceRows(topicId);
  // Cooldown/freshness are computed only from the YouTube-search cache — a
  // user manually adding their own resource must never block or reset the
  // refresh cooldown for the discovered set.
  const existingFetchedAt = computeFetchedAt(discoveredRows(existingRows));

  if (existingFetchedAt && Date.now() - existingFetchedAt.getTime() < REFRESH_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil((REFRESH_COOLDOWN_MS - (Date.now() - existingFetchedAt.getTime())) / 1000);
    throw new RefreshCooldownError(retryAfterSeconds);
  }

  let newRows: ResourceRow[];
  try {
    newRows = await buildResourceSet(topic.id, topic.topic);
  } catch (error) {
    if (existingRows.length > 0) {
      return {
        resources: existingRows,
        fetchedAt: existingFetchedAt,
        stale: isStale(existingFetchedAt),
        warning: warningMessageFor(error),
      };
    }
    throw error;
  }

  // Only reached once the new set has been fully and successfully produced.
  // Scoped to SEARCH/CURATED only — a USER_ADDED resource is never touched
  // by a refresh, regardless of how many times it runs.
  await prisma.learningResource.deleteMany({
    where: { learningTopicId: topicId, discoveryMethod: { in: ["SEARCH", "CURATED"] } },
  });
  if (newRows.length > 0) {
    await prisma.learningResource.createMany({ data: newRows });
  }

  const savedRows = await getResourceRows(topicId);
  const fetchedAt = computeFetchedAt(discoveredRows(savedRows));
  return { resources: savedRows, fetchedAt, stale: isStale(fetchedAt), warning: null };
}
