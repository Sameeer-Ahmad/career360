// Pure bookkeeping for a bounded resume tailoring session (one comprehensive pass + up to 3 refinement rounds)
// that always preserves the best-scoring draft, even if a later round scores worse.
import type { RequirementMatch, ResumeSuggestion, SuggestionType } from "@/lib/resume/resume-analysis";

/** 1 comprehensive first pass + up to 3 refinement rounds. */
export const MAX_TAILORING_ANALYSES = 4;

export type AppliedSessionSuggestion = { type: SuggestionType; title: string; masterExcerpt: string | null };
export type RejectedSessionSuggestion = { type: SuggestionType; title: string; rationale: string };

export type TailoringSessionState = {
  /** How many match-mode analyses have completed in this session, 0-4. */
  analysisCount: number;
  bestScore: number | null;
  bestDraftContent: string | null;
  tailoringComplete: boolean;
  appliedSuggestions: AppliedSessionSuggestion[];
  rejectedSuggestions: RejectedSessionSuggestion[];
};

export const INITIAL_TAILORING_SESSION: TailoringSessionState = {
  analysisCount: 0,
  bestScore: null,
  bestDraftContent: null,
  tailoringComplete: false,
  appliedSuggestions: [],
  rejectedSuggestions: [],
};

/** Starts a brand-new session — used when the user clicks the top Analyze/Re-analyze button. */
export function startNewSession(): TailoringSessionState {
  return INITIAL_TAILORING_SESSION;
}

/** False once the round budget is spent or an earlier round finished early; a fresh session is always allowed. */
export function canStartNextAnalysis(session: TailoringSessionState, isNewSession: boolean): boolean {
  if (isNewSession) return true;
  return session.analysisCount < MAX_TAILORING_ANALYSES && !session.tailoringComplete;
}

/** callNumber is 1-4; aiRound is the Gemini-facing round (0 = first pass, 1-3 = refinement round N of 3). */
export function nextTailoringCall(
  session: TailoringSessionState,
  isNewSession: boolean,
): { callNumber: number; aiRound: number } {
  const callNumber = isNewSession ? 1 : Math.min(session.analysisCount + 1, MAX_TAILORING_ANALYSES);
  const aiRound = callNumber <= 1 ? 0 : Math.max(1, Math.min(callNumber - 1, 3));
  return { callNumber, aiRound };
}

type SuggestionOutcome = {
  type: SuggestionType;
  title: string;
  masterExcerpt: string | null;
  rationale: string;
  status: "accepted" | "rejected" | "pending";
};

/** Builds the outcome list `foldRoundIntoHistory` expects from a round's suggestions + their UI accept/reject state. */
export function suggestionOutcomes(
  suggestions: ResumeSuggestion[],
  statuses: Record<string, "accepted" | "rejected" | "pending" | undefined>,
): SuggestionOutcome[] {
  return suggestions.map((s) => ({
    type: s.type,
    title: s.title,
    masterExcerpt: s.masterExcerpt,
    rationale: s.rationale,
    status: statuses[s.id] ?? "pending",
  }));
}

/** Folds a finished round's outcomes into history so a later round's request can tell Gemini what's already applied/rejected. */
export function foldRoundIntoHistory(
  session: TailoringSessionState,
  outcomes: SuggestionOutcome[],
): Pick<TailoringSessionState, "appliedSuggestions" | "rejectedSuggestions"> {
  const newlyApplied = outcomes
    .filter((s) => s.status === "accepted")
    .map((s) => ({ type: s.type, title: s.title, masterExcerpt: s.masterExcerpt }));
  const newlyRejected = outcomes
    .filter((s) => s.status === "rejected")
    .map((s) => ({ type: s.type, title: s.title, rationale: s.rationale }));
  return {
    appliedSuggestions: [...session.appliedSuggestions, ...newlyApplied],
    rejectedSuggestions: [...session.rejectedSuggestions, ...newlyRejected],
  };
}

/** Remaining WEAK/MISSING requirements from the most recent analysis — sent as "focus on these gaps" context for the next round. */
export function remainingGapsFrom(
  requirementMatches: RequirementMatch[],
): { requirement: string; status: "WEAK" | "MISSING" }[] {
  return requirementMatches
    .filter((r): r is RequirementMatch & { status: "WEAK" | "MISSING" } => r.status !== "MATCHED")
    .map((r) => ({ requirement: r.requirement, status: r.status }));
}

// Updates best-score/best-draft only on a tie-or-better result, so a worse-scoring round never overwrites the best one.
// Marks the session complete at the round budget or once a round returns no further suggestions.
export function applyAnalysisResult(
  session: TailoringSessionState,
  result: { callNumber: number; score: number; content: string; suggestionCount: number },
): TailoringSessionState {
  const becameBest = session.bestScore === null || result.score >= session.bestScore;
  return {
    ...session,
    analysisCount: result.callNumber,
    bestScore: becameBest ? result.score : session.bestScore,
    bestDraftContent: becameBest ? result.content : session.bestDraftContent,
    tailoringComplete:
      session.tailoringComplete || result.callNumber >= MAX_TAILORING_ANALYSES || result.suggestionCount === 0,
  };
}
