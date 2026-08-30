// Curated official-documentation config, matched deterministically against a topic string — no AI, no scraping.
// A topic matching no entry simply gets no DOCUMENTATION resource.

export type OfficialDocEntry = {
  key: string;
  title: string;
  url: string;
  aliases: string[];
};

export const OFFICIAL_DOCS: OfficialDocEntry[] = [
  { key: "react", title: "React Documentation", url: "https://react.dev/", aliases: ["react", "react.js", "reactjs"] },
  { key: "nextjs", title: "Next.js Documentation", url: "https://nextjs.org/docs", aliases: ["next.js", "nextjs", "next js"] },
  { key: "fastapi", title: "FastAPI Documentation", url: "https://fastapi.tiangolo.com/", aliases: ["fastapi"] },
  { key: "postgresql", title: "PostgreSQL Documentation", url: "https://www.postgresql.org/docs/", aliases: ["postgresql", "postgres"] },
  { key: "aws", title: "AWS Documentation", url: "https://docs.aws.amazon.com/", aliases: ["aws", "amazon web services"] },
  { key: "python", title: "Python Documentation", url: "https://docs.python.org/3/", aliases: ["python"] },
  { key: "typescript", title: "TypeScript Documentation", url: "https://www.typescriptlang.org/docs/", aliases: ["typescript"] },
  { key: "mongodb", title: "MongoDB Documentation", url: "https://www.mongodb.com/docs/", aliases: ["mongodb", "mongo"] },
  { key: "docker", title: "Docker Documentation", url: "https://docs.docker.com/", aliases: ["docker"] },
  { key: "nodejs", title: "Node.js Documentation", url: "https://nodejs.org/en/docs", aliases: ["node.js", "nodejs", "node js"] },
  { key: "django", title: "Django Documentation", url: "https://docs.djangoproject.com/", aliases: ["django"] },
];

/** Matches a topic string against the curated config, case-insensitively by alias substring. Returns at most `limit` entries in declaration order; [] on no match. */
export function matchOfficialDocs(topic: string, limit: number): OfficialDocEntry[] {
  const normalized = topic.toLowerCase();
  const matches: OfficialDocEntry[] = [];
  for (const entry of OFFICIAL_DOCS) {
    if (entry.aliases.some((alias) => normalized.includes(alias))) {
      matches.push(entry);
    }
    if (matches.length >= limit) break;
  }
  return matches;
}
