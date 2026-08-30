// Human-readable slug for /applications/<slug> — the real id is the ObjectId;
// only the trailing shortId is used to resolve it, so a stale company/title
// (renamed since the slug was generated) still resolves correctly.

const SHORT_ID_LENGTH = 6;

function slugifyPart(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function applicationShortId(id: string): string {
  return id.slice(-SHORT_ID_LENGTH).toLowerCase();
}

export function buildApplicationSlug(application: { id: string; jobTitle: string; company: { name: string } }): string {
  const companySlug = slugifyPart(application.company.name) || "company";
  const jobSlug = slugifyPart(application.jobTitle) || "role";
  return `${companySlug}-${jobSlug}-${applicationShortId(application.id)}`;
}

/** The trailing `-xxxxxx` short id on a slug (or any string) — null if it doesn't end with one. */
export function extractShortId(value: string): string | null {
  const match = /-([0-9a-f]{6})$/i.exec(value);
  return match ? match[1].toLowerCase() : null;
}
