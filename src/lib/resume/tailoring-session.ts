/**
 * Pure, client-agnostic bookkeeping for a bounded, best-result-preserving
 * resume tailoring session: at most one comprehensive first pass plus 3
 * refinement rounds, with the best-scoring draft always preserved even if a
 * later round scores lower. No server-side session storage is involved —
 * the UI holds this state and resends the relevant parts (applied/rejected
 * suggestions, remaining gaps) as prompt context on each refinement request.
 * Kept separate from the resume-analysis-panel component so the actual
 * decision logic (round capping, best-score comparison, early completion) is
 * unit-testable without a component-test harness.
 */
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

/**
 * Whether another (non-fresh) analysis is allowed to run right now. False
 * once the round budget is spent, or an earlier round already finished the
 * session early (no meaningful improvements left) — starting a brand-new
 * session (isNewSession: true) is always allowed regardless.
 */
export function canStartNextAnalysis(session: TailoringSessionState, isNewSession: boolean): boolean {
  if (isNewSession) return true;
  return session.analysisCount < MAX_TAILORING_ANALYSES && !session.tailoringComplete;
}

/**
 * The call number (1-4) the next request represents, and the AI-facing
 * refinement round to tell Gemini about (0 = first-pass/no session context;
 * 1-3 = "refinement round N of 3", matching the round the request's applied/
 * rejected/remaining-gap context reflects).
 */
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

/**
 * Folds a just-finished round's suggestion outcomes into the session's
 * cross-round history — this is what lets the next round's request tell
 * Gemini "already applied: ..." / "already rejected: ...", so an accepted
 * Master Resume suggestion (or any other accepted suggestion) can never be
 * re-proposed in a later round of the same session.
 */
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

/**
 * Applies one completed analysis to the session: advances the call counter,
 * and updates best-score/best-draft ONLY when this result matches or beats
 * the current best — never on a regression. This is the core "best result
 * always wins" guarantee: a worse-scoring later round can never overwrite a
 * better earlier one. Also marks the session complete once the round budget
 * is spent, or a round comes back with no further suggestions at all (early
 * completion — the user is never forced through all 3 rounds).
 */
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
