// Deterministic, no-schema-change human-readable slugs for the Application
// detail URL — /applications/<company>-<job-title>-<shortId>. The
// authoritative identifier remains the full MongoDB ObjectId; shortId is
// just its last 6 hex characters, used only to resolve a slug back to a
// real id (scoped to the requesting user's own applications — see
// resolveApplicationId in applications.ts). The company/job-title portion
// of the slug is cosmetic only and is never used for lookup, so a stale
// slug (company/title renamed since the URL was generated or shared)
// still resolves correctly rather than 404ing.

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
