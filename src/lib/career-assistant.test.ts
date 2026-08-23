import { describe, expect, it } from "vitest";
import {
  buildAssistantPrompt,
  CAREER_ASSISTANT_SYSTEM_INSTRUCTION,
  MAX_QUESTION_LENGTH,
  toApplicationContext,
  validateQuestion,
  ValidationError,
} from "@/lib/career-assistant";

describe("validateQuestion", () => {
  it("trims and returns a valid question", () => {
    expect(validateQuestion("  How do I prepare?  ")).toBe("How do I prepare?");
  });

  it("rejects empty input", () => {
    expect(() => validateQuestion("")).toThrow(ValidationError);
    expect(() => validateQuestion("   ")).toThrow(ValidationError);
  });

  it("rejects non-string input", () => {
    expect(() => validateQuestion(undefined)).toThrow(ValidationError);
    expect(() => validateQuestion(42)).toThrow(ValidationError);
    expect(() => validateQuestion(null)).toThrow(ValidationError);
  });

  it("rejects input longer than the max length", () => {
    const tooLong = "a".repeat(MAX_QUESTION_LENGTH + 1);
    expect(() => validateQuestion(tooLong)).toThrow(ValidationError);
  });

  it("accepts input exactly at the max length", () => {
    const atLimit = "a".repeat(MAX_QUESTION_LENGTH);
    expect(validateQuestion(atLimit)).toBe(atLimit);
  });
});

describe("toApplicationContext", () => {
  it("picks only career-relevant fields, dropping IDs and timestamps", () => {
    const application = {
      id: 999,
      userId: 1,
      companyId: 2,
      jobTitle: "Senior Engineer",
      company: { name: "Acme Corp" },
      location: "Remote",
      employmentType: "FULL_TIME" as const,
      status: "INTERVIEW" as const,
      priority: "HIGH" as const,
      salaryMin: 100000,
      salaryMax: 130000,
      jobDescription: "Build things.",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const context = toApplicationContext(application);

    expect(context).toEqual({
      jobTitle: "Senior Engineer",
      companyName: "Acme Corp",
      location: "Remote",
      employmentType: "FULL_TIME",
      status: "INTERVIEW",
      priority: "HIGH",
      salaryMin: 100000,
      salaryMax: 130000,
      jobDescription: "Build things.",
    });
    expect(context).not.toHaveProperty("id");
    expect(context).not.toHaveProperty("userId");
    expect(context).not.toHaveProperty("companyId");
  });
});

describe("buildAssistantPrompt", () => {
  it("returns the bare question when no application context is given", () => {
    expect(buildAssistantPrompt("What skills should I strengthen?")).toBe(
      "What skills should I strengthen?",
    );
  });

  it("includes application context and the question when context is given", () => {
    const context = toApplicationContext({
      jobTitle: "Senior Engineer",
      company: { name: "Acme Corp" },
      location: "Remote",
      employmentType: "FULL_TIME" as const,
      status: "INTERVIEW" as const,
      priority: "HIGH" as const,
      salaryMin: 100000,
      salaryMax: 130000,
      jobDescription: "Build things.",
    });

    const prompt = buildAssistantPrompt("How should I prepare?", context);

    expect(prompt).toContain("Senior Engineer");
    expect(prompt).toContain("Acme Corp");
    expect(prompt).toContain("Remote");
    expect(prompt).toContain("Build things.");
    expect(prompt).toContain("How should I prepare?");
  });

  it("omits fields that are null in the context", () => {
    const context = toApplicationContext({
      jobTitle: "Engineer",
      company: { name: "Acme" },
      location: null,
      employmentType: null,
      status: "WISHLIST" as const,
      priority: null,
      salaryMin: null,
      salaryMax: null,
      jobDescription: null,
    });

    const prompt = buildAssistantPrompt("Any advice?", context);

    expect(prompt).not.toContain("Location:");
    expect(prompt).not.toContain("Employment type:");
    expect(prompt).not.toContain("Priority:");
    expect(prompt).not.toContain("Salary:");
  });
});

describe("CAREER_ASSISTANT_SYSTEM_INSTRUCTION", () => {
  it("establishes the assistant's role and guardrails", () => {
    expect(CAREER_ASSISTANT_SYSTEM_INSTRUCTION).toContain("Career360");
    expect(CAREER_ASSISTANT_SYSTEM_INSTRUCTION.toLowerCase()).toContain("never reveal");
  });
});
