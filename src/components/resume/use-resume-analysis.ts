import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import type { ResumeJdMatch, ResumeSuggestion } from "@/lib/resume/resume-analysis";
import {
  applyAnalysisResult,
  canStartNextAnalysis,
  foldRoundIntoHistory,
  INITIAL_TAILORING_SESSION,
  nextTailoringCall,
  remainingGapsFrom,
  startNewSession,
  suggestionOutcomes,
  type TailoringSessionState,
} from "@/lib/resume/tailoring-session";
import { MAX_JOB_DESCRIPTION_LENGTH } from "@/lib/job-analysis/job-analysis";
import type {
  AnalysisResult,
  ApplicationOption,
  ResumeAnalysisApplicationContext,
  ResumeOption,
  SuggestionState,
} from "@/components/resume/resume-analysis-types";

export function useResumeAnalysis({
  resumes,
  applicationOptions,
  initialDocumentId,
  applicationContext,
}: {
  resumes: ResumeOption[];
  applicationOptions: ApplicationOption[];
  initialDocumentId?: string;
  applicationContext?: ResumeAnalysisApplicationContext;
}) {
  const toast = useToast();

  // Local copy so a newly-created tailored version can be added to the
  // dropdown immediately after saving, without a server round-trip that
  // would otherwise reset all the in-progress analysis/comparison state.
  const [localResumes, setLocalResumes] = useState<ResumeOption[]>(resumes);

  const [documentId, setDocumentId] = useState<string | "">(
    initialDocumentId && resumes.some((r) => r.id === initialDocumentId)
      ? initialDocumentId
      : (resumes[0]?.id ?? ""),
  );
  const [masterDocumentId, setMasterDocumentId] = useState<string | "">("");
  const [analysisMode, setAnalysisMode] = useState<"readiness" | "match">(
    applicationContext ? "match" : "readiness",
  );

  // JD source, only relevant when no applicationContext was preselected via URL.
  const [jdSource, setJdSource] = useState<"application" | "paste">(
    applicationOptions.length > 0 ? "application" : "paste",
  );
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | "">("");
  const [selectedApplicationPreview, setSelectedApplicationPreview] = useState<{
    jobTitle: string;
    companyName: string;
    jobDescription: string;
  } | null>(null);
  const [standaloneDescription, setStandaloneDescription] = useState("");

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestInFlight = useRef(false);

  const [sourceContent, setSourceContent] = useState<string | null>(null);
  const [suggestionStates, setSuggestionStates] = useState<Record<string, SuggestionState>>({});

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [updatingInPlace, setUpdatingInPlace] = useState(false);

  // Set right before an automatic post-save re-analysis, so the comparison
  // card can show what changed. A single, explicit, user-triggered snapshot
  // — never an automatic loop.
  const [beforeMatch, setBeforeMatch] = useState<ResumeJdMatch | null>(null);
  const [appliedTitles, setAppliedTitles] = useState<string[]>([]);

  // Bounded, best-result-preserving tailoring session — everything since the
  // last fresh Analyze click (see handleManualAnalyze, which always resets
  // this via startNewSession()). The actual round-capping / best-score /
  // early-completion decisions live in src/lib/tailoring-session.ts (pure,
  // unit-tested) — this component only wires that state through to fetch
  // calls and UI.
  const [session, setSession] = useState<TailoringSessionState>(INITIAL_TAILORING_SESSION);
  const [restoringBest, setRestoringBest] = useState(false);

  const selectedResume = localResumes.find((r) => r.id === documentId);

  // Fetch the selected resume's full content client-side — needed to build a
  // tailored draft locally (accepted suggestions are applied via plain text
  // replacement, not another AI call) and to save it.
  useEffect(() => {
    // documentId is only "" when there are no resumes at all, in which case
    // the component returns its empty state below and this fetch is moot.
    if (documentId === "") return;
    let cancelled = false;
    fetch(`/api/documents/${documentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((doc) => {
        if (!cancelled) setSourceContent(doc?.content ?? null);
      })
      .catch(() => {
        if (!cancelled) setSourceContent(null);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  // Preview the selected application's JD client-side (display only — the
  // analyze request always sends applicationId, never this fetched text, so
  // the server's stored JD stays authoritative regardless of what's shown
  // here).
  useEffect(() => {
    // Nothing to fetch when there's no in-page application selection — the
    // derivation of activeApplicationPreview below ignores stale preview
    // state whenever these conditions aren't met, so no reset is needed here.
    if (jdSource !== "application" || selectedApplicationId === "") return;
    let cancelled = false;
    fetch(`/api/applications/${selectedApplicationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((app) => {
        if (cancelled || !app) return;
        setSelectedApplicationPreview({
          jobTitle: app.jobTitle,
          companyName: app.company?.name ?? "",
          jobDescription: app.jobDescription ?? "",
        });
      })
      .catch(() => {
        if (!cancelled) setSelectedApplicationPreview(null);
      });
    return () => {
      cancelled = true;
    };
  }, [jdSource, selectedApplicationId]);

  // The application actually driving this analysis — URL-preselected takes
  // priority over the in-page selector.
  const activeApplicationId = applicationContext?.id ?? (jdSource === "application" ? selectedApplicationId : "");
  const activeApplicationPreview =
    applicationContext ??
    (jdSource === "application" && selectedApplicationId !== "" ? selectedApplicationPreview : null);

  const descriptionLength = standaloneDescription.trim().length;
  const needsManualDescription = analysisMode === "match" && !applicationContext && jdSource === "paste";
  const canAnalyze =
    !loading &&
    documentId !== "" &&
    (analysisMode === "readiness" ||
      activeApplicationId !== "" ||
      (jdSource === "paste" && descriptionLength > 0 && descriptionLength <= MAX_JOB_DESCRIPTION_LENGTH));

  const suggestions = result?.mode === "match" ? result.match.suggestions : [];

  // Accepts an explicit target id so a post-save re-analysis can run against
  // the just-created/updated document immediately, without waiting for
  // `documentId` state to propagate through a render — no effect required.
  //
  // `isNewSession: true` (only from handleManualAnalyze, the top Analyze/
  // Re-analyze button) always starts a fresh, comprehensive first pass and
  // resets the whole tailoring session (round count, best score/draft,
  // applied/rejected history). Every other caller (the automatic post-save
  // re-analysis) continues the current session as the next refinement round,
  // and is a no-op once the 3-round budget is spent — see canStartNextAnalysis.
  //
  // `content` is the resume text this analysis actually corresponds to
  // (explicitly known by save/update callers at the moment they call this,
  // since `sourceContent` state may not have refetched yet) — used to track
  // the best-scoring draft's actual text, not just its document id, so it
  // survives even if a later round overwrites that same document in place.
  async function analyze(
    targetDocumentId: string | "" = documentId,
    options: { content?: string; isNewSession?: boolean } = {},
  ) {
    if (requestInFlight.current || targetDocumentId === "") return;
    const isNewSession = options.isNewSession ?? false;
    if (!canStartNextAnalysis(session, isNewSession)) return;

    requestInFlight.current = true;
    setLoading(true);
    setError(null);

    const sessionForRequest = isNewSession
      ? startNewSession()
      : result?.mode === "match"
        ? {
            ...session,
            ...foldRoundIntoHistory(
              session,
              suggestionOutcomes(
                suggestions,
                Object.fromEntries(Object.entries(suggestionStates).map(([id, s]) => [id, s.status])),
              ),
            ),
          }
        : session;
    if (isNewSession) setSession(sessionForRequest);

    const { callNumber, aiRound } = nextTailoringCall(sessionForRequest, isNewSession);
    const remainingGaps =
      !isNewSession && result?.mode === "match" ? remainingGapsFrom(result.match.requirementMatches) : [];

    setResult(null);
    setSuggestionStates({});

    try {
      const response = await fetch("/api/ai/resume-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: targetDocumentId,
          ...(analysisMode === "match"
            ? {
                ...(activeApplicationId !== ""
                  ? { applicationId: activeApplicationId }
                  : { jobDescription: standaloneDescription.trim() }),
                ...(masterDocumentId !== "" ? { masterDocumentId } : {}),
                ...(aiRound > 0
                  ? {
                      tailoringRound: aiRound,
                      appliedSuggestions: sessionForRequest.appliedSuggestions,
                      rejectedSuggestions: sessionForRequest.rejectedSuggestions,
                      remainingGaps,
                    }
                  : {}),
              }
            : {}),
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (body.mode === "match") {
        const match = body.match as ResumeJdMatch;
        setResult({ mode: "match", match });
        setSession(
          applyAnalysisResult(sessionForRequest, {
            callNumber,
            score: match.overallScore,
            content: options.content ?? sourceContent ?? "",
            suggestionCount: match.suggestions.length,
          }),
        );
      } else {
        setResult({ mode: "readiness", readiness: body.readiness });
      }
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
      requestInFlight.current = false;
    }
  }

  // Used by the top Analyze/Re-analyze button — always starts a brand-new
  // tailoring session (see analyze()'s isNewSession handling), and clears
  // any stale before/after comparison from a previous session.
  function handleManualAnalyze() {
    setBeforeMatch(null);
    setAppliedTitles([]);
    analyze(documentId, { isNewSession: true });
  }

  function updateSuggestion(id: string, patch: Partial<SuggestionState>, fallbackText: string) {
    setSuggestionStates((prev) => ({
      ...prev,
      [id]: { status: prev[id]?.status ?? "pending", text: prev[id]?.text ?? fallbackText, ...patch },
    }));
  }

  function findSuggestion(id: string): ResumeSuggestion | undefined {
    return suggestions.find((s) => s.id === id);
  }

  function handleAccept(id: string) {
    const suggestion = findSuggestion(id);
    updateSuggestion(id, { status: "accepted" }, suggestion?.suggested ?? "");
  }

  function handleReject(id: string) {
    const suggestion = findSuggestion(id);
    updateSuggestion(id, { status: "rejected" }, suggestion?.suggested ?? "");
  }

  function handleChangeText(id: string, text: string) {
    updateSuggestion(id, { text }, text);
  }

  // The draft is built deterministically from the source content by applying
  // accepted suggestions — no AI call, fully transparent, and easy for the
  // user to verify before saving. BULLET suggestions rewrite existing text
  // in place; MASTER_CONTENT suggestions append verified Master Resume
  // content rather than replacing anything (there's nothing to replace).
  const draftContent = (() => {
    if (!sourceContent) return "";
    let content = sourceContent;
    const appended: string[] = [];
    for (const suggestion of suggestions) {
      const state = suggestionStates[suggestion.id];
      if (state?.status !== "accepted") continue;
      if (suggestion.type === "BULLET" && suggestion.current) {
        content = content.split(suggestion.current).join(state.text);
      } else if (suggestion.type === "MASTER_CONTENT" && suggestion.masterExcerpt) {
        appended.push(state.text);
      }
    }
    return appended.length > 0 ? `${content}\n\n${appended.join("\n\n")}` : content;
  })();

  const acceptedSuggestionTitles = suggestions
    .filter((s) => suggestionStates[s.id]?.status === "accepted")
    .map((s) => s.title);
  const acceptedCount = acceptedSuggestionTitles.length;
  const contentChanged = draftContent !== sourceContent;
  const canRestoreBest =
    session.bestDraftContent !== null &&
    Boolean(selectedResume?.isTailored) &&
    session.bestDraftContent !== sourceContent;

  async function handleSaveVersion(title: string) {
    if (documentId === "" || saving || result?.mode !== "match") return;
    const contentToSave = draftContent || sourceContent || "";
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: contentToSave,
          applicationId: activeApplicationId !== "" ? activeApplicationId : null,
          masterDocumentId: masterDocumentId !== "" ? masterDocumentId : null,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.issues?.[0] ?? body?.error ?? "Could not save this version. Please try again.";
        setSaveError(message);
        toast.error(message);
        setSaving(false);
        return;
      }

      setLocalResumes((prev) => [
        ...prev,
        { id: body.id, title: body.title, resumeRole: null, isTailored: true },
      ]);
      setSaveDialogOpen(false);
      setSaving(false);
      setDocumentId(body.id);
      toast.success("Resume version saved");
      // Once the round budget is spent, there's nothing new to compare —
      // leave the last "tailoring complete" comparison as-is and just save.
      if (!session.tailoringComplete) {
        setBeforeMatch(result.match);
        setAppliedTitles(acceptedSuggestionTitles);
        analyze(body.id, { content: contentToSave });
      }
    } catch {
      setSaveError("Network error — please check your connection and try again.");
      toast.error("Network error — please check your connection and try again.");
      setSaving(false);
    }
  }

  async function handleUpdateInPlace() {
    if (documentId === "" || updatingInPlace || !selectedResume || result?.mode !== "match") return;
    const contentToSave = draftContent || sourceContent || "";
    setUpdatingInPlace(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToSave }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const message = body?.error ?? "Could not update this version. Please try again.";
        setError(message);
        toast.error(message);
        setUpdatingInPlace(false);
        return;
      }

      setUpdatingInPlace(false);
      setSourceContent(contentToSave);
      toast.success("Resume updated");
      if (!session.tailoringComplete) {
        setBeforeMatch(result.match);
        setAppliedTitles(acceptedSuggestionTitles);
        analyze(documentId, { content: contentToSave });
      }
    } catch {
      setError("Network error — please check your connection and try again.");
      toast.error("Network error — please check your connection and try again.");
      setUpdatingInPlace(false);
    }
  }

  function handleDismissComparison() {
    setBeforeMatch(null);
    setAppliedTitles([]);
  }

  function handleImproveAgain() {
    setBeforeMatch(null);
    setAppliedTitles([]);
    // Suggestions from the automatic re-analysis are already visible below —
    // this just clears the comparison banner so the user can keep working.
  }

  // A pure recovery action — restores the best-scoring draft's text onto the
  // CURRENT tailored document, without consuming a round or calling Gemini.
  // Only ever targets an already-tailored document (never Main/Master),
  // matching the same gating "Update This Version" uses.
  async function handleRestoreBest() {
    const bestDraftContent = session.bestDraftContent;
    if (!bestDraftContent || documentId === "" || !selectedResume?.isTailored || restoringBest) return;
    setRestoringBest(true);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: bestDraftContent }),
      });
      if (response.ok) {
        setSourceContent(bestDraftContent);
      }
    } catch {
      // Best-effort — bestDraftContent stays in session state either way, so
      // the user can simply try again.
    } finally {
      setRestoringBest(false);
    }
  }

  return {
    localResumes,
    documentId,
    setDocumentId,
    masterDocumentId,
    setMasterDocumentId,
    analysisMode,
    setAnalysisMode,
    jdSource,
    setJdSource,
    selectedApplicationId,
    setSelectedApplicationId,
    standaloneDescription,
    setStandaloneDescription,
    result,
    error,
    loading,
    suggestionStates,
    saveDialogOpen,
    setSaveDialogOpen,
    saving,
    saveError,
    updatingInPlace,
    beforeMatch,
    appliedTitles,
    session,
    restoringBest,
    selectedResume,
    activeApplicationId,
    activeApplicationPreview,
    descriptionLength,
    needsManualDescription,
    canAnalyze,
    suggestions,
    draftContent,
    acceptedSuggestionTitles,
    acceptedCount,
    contentChanged,
    canRestoreBest,
    analyze,
    handleManualAnalyze,
    handleAccept,
    handleReject,
    handleChangeText,
    handleSaveVersion,
    handleUpdateInPlace,
    handleDismissComparison,
    handleImproveAgain,
    handleRestoreBest,
  };
}
