// Kept separate from src/lib/applications.ts (which imports the Prisma client)
// so client components can import just this constant without pulling in
// server-only database code into the browser bundle.
export const APPLICATION_SORTS = [
  "appliedDesc",
  "appliedAsc",
  "titleAsc",
  "titleZa",
  "companyAsc",
  "priority",
  "updatedDesc",
] as const;

export type ApplicationSort = (typeof APPLICATION_SORTS)[number];
