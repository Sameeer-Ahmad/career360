// Explicitly-verified allowlist of official YouTube channels, keyed by channelId (never by name, which isn't unique).
// A match sets isOfficial=true for the ranking bonus; a channel not listed here simply gets no bonus, not a penalty.

export const OFFICIAL_CHANNEL_IDS: Record<string, string> = {
  // freeCodeCamp.org — https://www.youtube.com/channel/UC8butISFwT-Wl7EV0hUK0BQ
  "UC8butISFwT-Wl7EV0hUK0BQ": "freeCodeCamp.org",
};

export function isOfficialChannel(channelId: string | null | undefined): boolean {
  return Boolean(channelId && channelId in OFFICIAL_CHANNEL_IDS);
}
