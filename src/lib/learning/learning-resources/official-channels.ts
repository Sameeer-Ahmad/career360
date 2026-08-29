// Small, explicitly-verified allowlist of official/high-quality YouTube
// channels, keyed by channelId — never by channel name (fuzzy name
// matching is deliberately avoided; a channel's declared "channelId" from
// a YouTube search result is unambiguous, a display name is not). A match
// sets isOfficial=true and applies the official bonus in ranking; a
// channel that is NOT in this list is never treated as lower-quality, it
// simply receives no bonus. This is a narrow "is this unambiguously the
// official/vetted account" allowlist, not a subjective "best channels"
// ranking, and is meant to grow over time without any ranking-logic
// change.

export const OFFICIAL_CHANNEL_IDS: Record<string, string> = {
  // freeCodeCamp.org — https://www.youtube.com/channel/UC8butISFwT-Wl7EV0hUK0BQ
  "UC8butISFwT-Wl7EV0hUK0BQ": "freeCodeCamp.org",
};

export function isOfficialChannel(channelId: string | null | undefined): boolean {
  return Boolean(channelId && channelId in OFFICIAL_CHANNEL_IDS);
}
