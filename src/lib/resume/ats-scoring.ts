// Deterministic, heuristic resume-readiness scoring — no AI involved. "ATS readiness" is Career360's own
// transparent estimate based on well-known signals (sections, bullets, metrics, contact info, length), not a guarantee of any real ATS.

export type ReadinessPriority = "HIGH" | "MEDIUM" | "LOW";

export const STRUCTURE_CATEGORY_KEYS = [
  "sections",
  "length",
  "bulletStructure",
  "measurableAchievements",
  "contactInfo",
] as const;
export type StructureCategoryKey = (typeof STRUCTURE_CATEGORY_KEYS)[number];

export type ReadinessCategory = {
  key: StructureCategoryKey;
  label: string;
  score: number;
  /** null when the category needs no action. */
  priority: ReadinessPriority | null;
  /** What was actually found in this resume for this category. */
  detected: string;
  /** Why this signal matters for ATS parsing / recruiter readability. */
  whyItMatters: string;
  /** A concrete, specific next step — or confirmation nothing needs to change. */
  recommendation: string;
};

export type ResumeStructureScore = {
  overallScore: number;
  categories: ReadinessCategory[];
};

type CategoryDetail = Omit<ReadinessCategory, "key" | "label">;

// Weights sum to 1. Adjustable, documented — not a claim to replicate any real ATS system.
const STRUCTURE_WEIGHTS: Record<StructureCategoryKey, number> = {
  sections: 0.3,
  length: 0.1,
  bulletStructure: 0.2,
  measurableAchievements: 0.25,
  contactInfo: 0.15,
};

const STRUCTURE_LABELS: Record<StructureCategoryKey, string> = {
  sections: "Section completeness",
  length: "Length",
  bulletStructure: "Bullet structure",
  measurableAchievements: "Measurable achievements",
  contactInfo: "Contact information",
};

const CORE_SECTIONS = [
  {
    label: "Experience",
    pattern: /\b(experience|work experience|employment history|professional experience)\b/i,
  },
  { label: "Education", pattern: /\beducation\b/i },
  { label: "Skills", pattern: /\b(skills|technical skills|core competencies)\b/i },
];

function scoreSections(content: string): CategoryDetail {
  const found = CORE_SECTIONS.filter((s) => s.pattern.test(content));
  const missing = CORE_SECTIONS.filter((s) => !s.pattern.test(content));
  const score = Math.round((found.length / CORE_SECTIONS.length) * 100);

  const detected =
    missing.length === 0
      ? `All ${CORE_SECTIONS.length} standard sections detected: ${CORE_SECTIONS.map((s) => s.label).join(", ")}.`
      : `Found ${found.length} of ${CORE_SECTIONS.length} standard sections${found.length > 0 ? ` (${found.map((s) => s.label).join(", ")})` : ""}. Missing: ${missing.map((s) => s.label).join(", ")}.`;

  return {
    score,
    priority: missing.length === 0 ? null : missing.length === CORE_SECTIONS.length ? "HIGH" : "MEDIUM",
    detected,
    whyItMatters:
      "ATS parsers and recruiters rely on standard section headers (Experience, Education, Skills) to navigate and correctly categorize resume content.",
    recommendation:
      missing.length === 0
        ? "All standard sections are present — no action needed."
        : `Add a clearly labeled "${missing.map((s) => s.label).join('" and "')}" section${missing.length > 1 ? "s" : ""} — content without a recognizable header risks being skipped by both ATS parsing and a quick recruiter scan.`,
  };
}

function scoreLength(content: string): CategoryDetail {
  const trimmed = content.trim();
  const length = trimmed.length;
  const words = trimmed.length > 0 ? trimmed.split(/\s+/).filter(Boolean).length : 0;
  const detected = `${length.toLocaleString()} characters (~${words.toLocaleString()} words).`;
  const whyItMatters =
    "Too short and a resume looks incomplete to both recruiters and ATS parsing; too long and readers (and some ATS previews) may not get through it.";

  if (length < 500) {
    return {
      score: 30,
      priority: "HIGH",
      detected,
      whyItMatters,
      recommendation:
        "This reads as too sparse for a recruiter or ATS to evaluate — add more detail, such as a few bullet points per role covering what you actually did and the impact.",
    };
  }
  if (length < 1200) {
    return {
      score: 65,
      priority: "MEDIUM",
      detected,
      whyItMatters,
      recommendation:
        "This is on the shorter side — check whether all relevant experience, skills, and achievements are actually captured.",
    };
  }
  if (length > 24000) {
    return {
      score: 70,
      priority: "LOW",
      detected,
      whyItMatters,
      recommendation:
        "This is a long document — expected for a Master Resume, but a version tailored for one specific application is usually stronger trimmed to roughly 1-2 pages.",
    };
  }
  return {
    score: 100,
    priority: null,
    detected,
    whyItMatters,
    recommendation: "Length is in a reasonable range — no action needed.",
  };
}

// Plain-text bullet markers, numbered lists, and LaTeX \resumeItem{/\item — deliberately narrow so an
// arbitrary LaTeX command (\resumeSubheading, \section, etc.) isn't counted as a bullet.
const BULLET_LINE = /^[-•*▪◦]|^\d+[.)]\s|^\\resumeItem\{|^\\item\b/;

function scoreBulletStructure(content: string): CategoryDetail {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return {
      score: 0,
      priority: "HIGH",
      detected: "No content to analyze.",
      whyItMatters: "Bulleted achievements are far easier for both recruiters and ATS parsers to scan than dense paragraphs.",
      recommendation: "Add resume content before this can be evaluated.",
    };
  }

  const bulletLines = lines.filter((l) => BULLET_LINE.test(l));
  const longProseLines = lines.filter((l) => !BULLET_LINE.test(l) && l.length > 160);
  const ratio = bulletLines.length / lines.length;
  const pct = Math.round(ratio * 100);
  const score = Math.round(Math.min(1, ratio * 2.5) * 100);
  const whyItMatters =
    "Bulleted achievements are far easier for both recruiters and ATS parsers to scan than dense paragraphs.";
  const detected = `${bulletLines.length} of ${lines.length} lines (${pct}%) use bullet-point formatting.${longProseLines.length > 0 ? ` ${longProseLines.length} long paragraph-style line${longProseLines.length === 1 ? "" : "s"} detected.` : ""}`;

  if (bulletLines.length === 0) {
    return {
      score,
      priority: "HIGH",
      detected,
      whyItMatters,
      recommendation:
        "Convert experience and project descriptions into bullet points (starting with \"-\" or \"•\") — this is the single biggest readability improvement available here.",
    };
  }
  if (ratio < 0.3) {
    return {
      score,
      priority: "MEDIUM",
      detected,
      whyItMatters,
      recommendation: `Only ${pct}% of lines are bulleted — convert more of the remaining paragraph-style text into concise bullets, especially under Experience.`,
    };
  }
  return {
    score,
    priority: null,
    detected,
    whyItMatters,
    recommendation: "Bullet usage looks solid — no action needed.",
  };
}

const METRIC_PATTERN =
  /(\d+(\.\d+)?\s?%|\$\s?\d|\b\d+(\.\d+)?\s?(x|k|m|million|billion|hours?|days?|weeks?|months?|years?|users?|customers?)\b)/i;

function scoreMeasurableAchievements(content: string): CategoryDetail {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = lines.filter((l) => BULLET_LINE.test(l));
  const candidateLines = bulletLines.length > 0 ? bulletLines : lines;
  const whyItMatters =
    "Where truthful, quantifying impact (percentages, scale, time saved) makes achievements concrete and easier to evaluate at a glance.";

  if (candidateLines.length === 0) {
    return {
      score: 0,
      priority: "HIGH",
      detected: "No bullet or content lines to evaluate.",
      whyItMatters,
      recommendation: "Add resume content before this can be evaluated.",
    };
  }

  const withMetrics = candidateLines.filter((l) => METRIC_PATTERN.test(l));
  const ratio = withMetrics.length / candidateLines.length;
  const pct = Math.round(ratio * 100);
  const score = Math.round(Math.min(1, ratio * 3) * 100);
  const detected = `${withMetrics.length} of ${candidateLines.length} bullet${candidateLines.length === 1 ? "" : "s"} (${pct}%) include a measurable result (a number, percentage, or scale).`;

  if (ratio < 0.15) {
    return {
      score,
      priority: withMetrics.length === 0 ? "HIGH" : "MEDIUM",
      detected,
      whyItMatters,
      recommendation:
        withMetrics.length === 0
          ? "No bullets currently include a measurable result — where a real number exists (users served, time saved, performance improved), add it to at least your strongest bullets."
          : `Only ${pct}% of bullets include a measurable result — look for other truthful metrics you can add to strengthen the rest.`,
    };
  }
  return {
    score,
    priority: null,
    detected,
    whyItMatters,
    recommendation: "A good share of bullets already include measurable results — no action needed.",
  };
}

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/;

function scoreContactInfo(content: string): CategoryDetail {
  const hasEmail = EMAIL_PATTERN.test(content);
  const hasPhone = PHONE_PATTERN.test(content);
  const detected = `Email: ${hasEmail ? "found" : "not found"}. Phone number: ${hasPhone ? "found" : "not found"}.`;
  const whyItMatters =
    "ATS systems and recruiters rely on contact details being present and easy to parse to actually reach a candidate.";

  if (!hasEmail) {
    return {
      score: hasPhone ? 40 : 20,
      priority: "HIGH",
      detected,
      whyItMatters,
      recommendation: "Add an email address — most ATS systems parse this as the primary contact field.",
    };
  }
  if (!hasPhone) {
    return {
      score: 80,
      priority: "LOW",
      detected,
      whyItMatters,
      recommendation: "Consider adding a phone number as a secondary contact method.",
    };
  }
  return {
    score: 100,
    priority: null,
    detected,
    whyItMatters,
    recommendation: "Email and phone number are both present — no action needed.",
  };
}

/** Deterministic, heuristic resume-structure scoring — no AI involved. */
export function scoreResumeStructure(content: string): ResumeStructureScore {
  const details: Record<StructureCategoryKey, CategoryDetail> = {
    sections: scoreSections(content),
    length: scoreLength(content),
    bulletStructure: scoreBulletStructure(content),
    measurableAchievements: scoreMeasurableAchievements(content),
    contactInfo: scoreContactInfo(content),
  };

  const categories: ReadinessCategory[] = STRUCTURE_CATEGORY_KEYS.map((key) => ({
    key,
    label: STRUCTURE_LABELS[key],
    ...details[key],
  }));

  const overallScore = Math.round(
    categories.reduce((sum, c) => sum + c.score * STRUCTURE_WEIGHTS[c.key], 0),
  );

  return { overallScore, categories };
}

// JD-match score — combines the structure score above with Gemini-classified evidence per requirement.
// Gemini never produces the final number; this module does.

export const RELEVANCE_LEVELS = ["STRONG", "MODERATE", "WEAK"] as const;
export type RelevanceLevel = (typeof RELEVANCE_LEVELS)[number];

/** Fixed, documented mapping from a qualitative relevance judgment to a numeric band. */
export function relevanceToScore(level: RelevanceLevel): number {
  switch (level) {
    case "STRONG":
      return 90;
    case "MODERATE":
      return 65;
    case "WEAK":
      return 35;
  }
}

export const REQUIREMENT_STATUSES = ["MATCHED", "WEAK", "MISSING"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export const REQUIREMENT_IMPORTANCE_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
export type RequirementImportance = (typeof REQUIREMENT_IMPORTANCE_LEVELS)[number];

export type RequirementMatch = {
  status: RequirementStatus;
  importance: RequirementImportance;
};

const REQUIREMENT_STATUS_CREDIT: Record<RequirementStatus, number> = {
  MATCHED: 1,
  WEAK: 0.5,
  MISSING: 0,
};

const IMPORTANCE_WEIGHT: Record<RequirementImportance, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/** Weighted coverage across all requirements, prioritizing HIGH-importance ones. 0-100. */
export function scoreRequirementCoverage(requirements: RequirementMatch[]): number {
  if (requirements.length === 0) return 0;
  const totalWeight = requirements.reduce((sum, r) => sum + IMPORTANCE_WEIGHT[r.importance], 0);
  if (totalWeight === 0) return 0;
  const earned = requirements.reduce(
    (sum, r) => sum + IMPORTANCE_WEIGHT[r.importance] * REQUIREMENT_STATUS_CREDIT[r.status],
    0,
  );
  return Math.round((earned / totalWeight) * 100);
}

/** Strict coverage of only HIGH-importance ("required") requirements — only MATCHED counts. */
export function scoreRequiredSkillCoverage(requirements: RequirementMatch[]): number {
  const required = requirements.filter((r) => r.importance === "HIGH");
  if (required.length === 0) return 100; // nothing explicitly marked required — don't penalize
  const matched = required.filter((r) => r.status === "MATCHED").length;
  return Math.round((matched / required.length) * 100);
}

export type JdMatchCategoryScores = {
  keywordAlignment: number;
  requiredSkillCoverage: number;
  experienceRelevance: number;
  projectRelevance: number;
  structure: number;
};

const JD_MATCH_WEIGHTS: Record<keyof JdMatchCategoryScores, number> = {
  keywordAlignment: 0.25,
  requiredSkillCoverage: 0.25,
  experienceRelevance: 0.2,
  projectRelevance: 0.15,
  structure: 0.15,
};

/** Weighted aggregate of the JD-match category scores — the transparent Career360 formula. */
export function computeJdMatchScore(categories: JdMatchCategoryScores): number {
  const total = (Object.keys(JD_MATCH_WEIGHTS) as (keyof JdMatchCategoryScores)[]).reduce(
    (sum, key) => sum + categories[key] * JD_MATCH_WEIGHTS[key],
    0,
  );
  return Math.round(total);
}
