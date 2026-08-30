import type { ResumeJdMatch, ResumeReadiness } from "@/lib/resume/resume-analysis";

export type ResumeAnalysisApplicationContext = {
  id: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
};

export type ResumeOption = {
  id: string;
  title: string;
  resumeRole: "MAIN" | "MASTER" | null;
  isTailored: boolean;
};

export type MasterOption = {
  id: string;
  title: string;
};

export type ApplicationOption = {
  id: string;
  jobTitle: string;
  companyName: string;
};

export type AnalysisResult =
  | { mode: "readiness"; readiness: ResumeReadiness }
  | { mode: "match"; match: ResumeJdMatch };

export type SuggestionStatus = "pending" | "accepted" | "rejected";
export type SuggestionState = { status: SuggestionStatus; text: string };
