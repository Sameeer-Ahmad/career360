const MAX_FOCUSED_VIDEO_DURATION_SECONDS = 90 * 60; // beyond this a single "video" resource reads as a full course dump, not focused

const RECENCY_HORIZON_YEARS = 6; // a video this old or older gets zero recency credit; a brand-new one gets full credit
const VIEW_SCORE_LOG_CAP = 7; // log10(viewCount) at which the view-score signal saturates at 1.0 (10,000,000 views)
const PLAYLIST_ITEM_COUNT_CAP = 30; // itemCount at which the playlist-size bonus saturates at 1.0

export const RANKING_WEIGHTS = {
  video: { titleRelevance: 0.45, descriptionRelevance: 0.15, officialBonus: 0.2, recency: 0.1, viewScore: 0.1 },
  playlist: { titleRelevance: 0.5, descriptionRelevance: 0.2, officialBonus: 0.2, itemCountBonus: 0.1 },
} as const;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9+.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Which of `topicTokens` appear in `text` — the basis for both relevance ratios and the whyRecommended copy. */
export function matchTerms(text: string, topicTokens: string[]): string[] {
  const textTokens = new Set(tokenize(text));
  return topicTokens.filter((token) => textTokens.has(token));
}

export function relevanceRatio(text: string, topicTokens: string[]): number {
  if (topicTokens.length === 0) return 0;
  return matchTerms(text, topicTokens).length / topicTokens.length;
}

export function recencyFactor(publishedAt: string | null): number {
  if (!publishedAt) return 0.5; // unknown — neutral, neither rewarded nor penalized
  const publishedMs = Date.parse(publishedAt);
  if (Number.isNaN(publishedMs)) return 0.5;
  const ageYears = (Date.now() - publishedMs) / (365.25 * 24 * 60 * 60 * 1000);
  return clamp(1 - ageYears / RECENCY_HORIZON_YEARS, 0, 1);
}

/** Log-scaled and capped so raw popularity can never dominate the score — a tie-breaker, not a ranking driver. */
export function viewScore(viewCount: number | null): number {
  if (viewCount === null || viewCount <= 0) return 0;
  return clamp(Math.log10(viewCount + 1) / VIEW_SCORE_LOG_CAP, 0, 1);
}

export function itemCountBonus(itemCount: number | null): number {
  if (!itemCount || itemCount <= 0) return 0;
  return clamp(itemCount / PLAYLIST_ITEM_COUNT_CAP, 0, 1);
}

function durationPenalty(durationSeconds: number | null): number {
  if (durationSeconds === null) return 0;
  return durationSeconds > MAX_FOCUSED_VIDEO_DURATION_SECONDS ? 0.1 : 0;
}

export function scoreVideo(input: {
  titleRelevance: number;
  descriptionRelevance: number;
  isOfficial: boolean;
  recency: number;
  views: number;
  durationSeconds: number | null;
}): number {
  const w = RANKING_WEIGHTS.video;
  const base =
    w.titleRelevance * input.titleRelevance +
    w.descriptionRelevance * input.descriptionRelevance +
    w.officialBonus * (input.isOfficial ? 1 : 0) +
    w.recency * input.recency +
    w.viewScore * input.views;
  return Math.max(0, base - durationPenalty(input.durationSeconds));
}

export function scorePlaylist(input: {
  titleRelevance: number;
  descriptionRelevance: number;
  isOfficial: boolean;
  itemCountBonus: number;
}): number {
  const w = RANKING_WEIGHTS.playlist;
  return (
    w.titleRelevance * input.titleRelevance +
    w.descriptionRelevance * input.descriptionRelevance +
    w.officialBonus * (input.isOfficial ? 1 : 0) +
    w.itemCountBonus * input.itemCountBonus
  );
}

// ---------------------------------------------------------------------------
// whyRecommended — deterministic, never AI-generated
// ---------------------------------------------------------------------------

export function videoWhyRecommended(matchedTerms: string[], topicText: string): string {
  if (matchedTerms.length === 0) return `Relevant to your topic: ${topicText}.`;
  return `Matches your topic's key terms: ${matchedTerms.slice(0, 4).join(", ")}.`;
}

export function playlistWhyRecommended(topicText: string): string {
  return `Relevant playlist covering ${topicText}.`;
}

export function documentationWhyRecommended(entryTitle: string): string {
  const label = entryTitle.replace(/ Documentation$/, "");
  return `Official documentation — primary reference for ${label}.`;
}
