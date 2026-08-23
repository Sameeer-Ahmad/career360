import { describe, expect, it } from "vitest";
import {
  buildJobAnalysisPrompt,
  JOB_ANALYSIS_SYSTEM_INSTRUCTION,
  MalformedAnalysisError,
  MAX_JOB_DESCRIPTION_LENGTH,
  parseJobAnalysis,
  validateJobDescription,
  ValidationError,
} from "@/lib/job-analysis";

describe("validateJobDescription", () => {
  it("trims and returns a valid description", () => {
    expect(validateJobDescription("  Build great software.  ")).toBe("Build great software.");
  });

  it("rejects empty input", () => {
    expect(() => validateJobDescription("")).toThrow(ValidationError);
    expect(() => validateJobDescription("   ")).toThrow(ValidationError);
  });

  it("rejects non-string input", () => {
    expect(() => validateJobDescription(undefined)).toThrow(ValidationError);
    expect(() => validateJobDescription(null)).toThrow(ValidationError);
    expect(() => validateJobDescription(123)).toThrow(ValidationError);
  });

  it("rejects input longer than the max length", () => {
    const tooLong = "a".repeat(MAX_JOB_DESCRIPTION_LENGTH + 1);
    expect(() => validateJobDescription(tooLong)).toThrow(ValidationError);
  });

  it("accepts input exactly at the max length", () => {
    const atLimit = "a".repeat(MAX_JOB_DESCRIPTION_LENGTH);
    expect(validateJobDescription(atLimit)).toBe(atLimit);
  });
});

describe("buildJobAnalysisPrompt", () => {
  it("includes the job description alone when no application context is given", () => {
    const prompt = buildJobAnalysisPrompt("Build things with React.");
    expect(prompt).toContain("Build things with React.");
    expect(prompt).not.toContain("Application context");
  });

  it("includes application context ahead of the job description when given", () => {
    const prompt = buildJobAnalysisPrompt("Build things with React.", {
      jobTitle: "Frontend Engineer",
      companyName: "Acme Corp",
      employmentType: "FULL_TIME",
      status: "APPLIED",
    });

    expect(prompt).toContain("Frontend Engineer");
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("Full-time");
    expect(prompt).toContain("Applied");
    expect(prompt).toContain("Build things with React.");
  });

  it("omits employment type when not provided", () => {
    const prompt = buildJobAnalysisPrompt("Build things.", {
      jobTitle: "Engineer",
      companyName: "Acme",
      employmentType: null,
      status: "WISHLIST",
    });
    expect(prompt).not.toContain("Employment type:");
  });
});

describe("JOB_ANALYSIS_SYSTEM_INSTRUCTION", () => {
  it("establishes the role and key guardrails", () => {
    expect(JOB_ANALYSIS_SYSTEM_INSTRUCTION).toContain("Career360");
    expect(JOB_ANALYSIS_SYSTEM_INSTRUCTION.toLowerCase()).toContain("never invent");
    expect(JOB_ANALYSIS_SYSTEM_INSTRUCTION.toLowerCase()).toContain("never reveal");
  });
});

function validAnalysisJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    overview: { roleTitle: "Frontend Engineer", seniority: "Mid-level", summary: "Builds UI." },
    responsibilities: ["Build UI", "Review PRs"],
    skills: {
      technical: ["Testing"],
      frameworksAndLibraries: ["React"],
      languages: ["TypeScript"],
      toolsAndPlatforms: ["Git"],
      softSkills: ["Communication"],
      domainKnowledge: [],
    },
    technologies: ["React", "TypeScript"],
    interviewFocus: ["React fundamentals"],
    preparationPriorities: [{ topic: "React", priority: "HIGH", reason: "Core requirement" }],
    preparationPlan: [
      {
        topic: "React",
        whyItMatters: "Primary framework",
        whatToStudy: "Hooks, state",
        practiceRecommendation: "Build a small app",
      },
    ],
    likelyQuestions: {
      technical: ["Explain the virtual DOM."],
      behavioral: ["Tell me about a conflict."],
      roleSpecific: ["How would you structure this app?"],
    },
    ...overrides,
  });
}

describe("parseJobAnalysis", () => {
  it("parses a well-formed structured response", () => {
    const analysis = parseJobAnalysis(validAnalysisJson());

    expect(analysis.overview.roleTitle).toBe("Frontend Engineer");
    expect(analysis.overview.seniority).toBe("Mid-level");
    expect(analysis.skills.frameworksAndLibraries).toEqual(["React"]);
    expect(analysis.preparationPriorities[0]).toEqual({
      topic: "React",
      priority: "HIGH",
      reason: "Core requirement",
    });
    expect(analysis.likelyQuestions.technical).toEqual(["Explain the virtual DOM."]);
  });

  it("throws MalformedAnalysisError for invalid JSON", () => {
    expect(() => parseJobAnalysis("not json")).toThrow(MalformedAnalysisError);
  });

  it("throws MalformedAnalysisError when overview is missing entirely", () => {
    expect(() => parseJobAnalysis(JSON.stringify({ responsibilities: [] }))).toThrow(
      MalformedAnalysisError,
    );
  });

  it("throws MalformedAnalysisError when the response is not an object", () => {
    expect(() => parseJobAnalysis(JSON.stringify(["a", "b"]))).toThrow(MalformedAnalysisError);
    expect(() => parseJobAnalysis(JSON.stringify(null))).toThrow(MalformedAnalysisError);
  });

  it("defaults missing optional array fields to empty arrays rather than failing", () => {
    const analysis = parseJobAnalysis(
      JSON.stringify({ overview: { roleTitle: "Engineer", summary: "Does engineering." } }),
    );

    expect(analysis.responsibilities).toEqual([]);
    expect(analysis.skills.technical).toEqual([]);
    expect(analysis.technologies).toEqual([]);
    expect(analysis.preparationPriorities).toEqual([]);
    expect(analysis.likelyQuestions.behavioral).toEqual([]);
  });

  it("normalizes an invalid priority value to MEDIUM", () => {
    const analysis = parseJobAnalysis(
      validAnalysisJson({
        preparationPriorities: [{ topic: "React", priority: "URGENT", reason: "Because" }],
      }),
    );
    expect(analysis.preparationPriorities[0].priority).toBe("MEDIUM");
  });

  it("drops non-string entries from array fields instead of crashing", () => {
    const analysis = parseJobAnalysis(
      validAnalysisJson({ technologies: ["React", 42, null, "TypeScript"] }),
    );
    expect(analysis.technologies).toEqual(["React", "TypeScript"]);
  });

  it("drops preparationPlan/priority entries with no topic", () => {
    const analysis = parseJobAnalysis(
      validAnalysisJson({
        preparationPriorities: [{ topic: "", priority: "HIGH", reason: "x" }],
        preparationPlan: [{ topic: "", whyItMatters: "x", whatToStudy: "y", practiceRecommendation: "z" }],
      }),
    );
    expect(analysis.preparationPriorities).toEqual([]);
    expect(analysis.preparationPlan).toEqual([]);
  });

  it("falls back to a generic role title when overview has only a summary", () => {
    const analysis = parseJobAnalysis(
      JSON.stringify({ overview: { summary: "Does engineering things." } }),
    );
    expect(analysis.overview.roleTitle).toBe("This role");
    expect(analysis.overview.summary).toBe("Does engineering things.");
  });

  it("treats a null seniority as null rather than the string 'null'", () => {
    const analysis = parseJobAnalysis(validAnalysisJson({ overview: { roleTitle: "Engineer", seniority: null, summary: "x" } }));
    expect(analysis.overview.seniority).toBeNull();
  });
});
