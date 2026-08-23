"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Briefcase, MessageSquareText, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { MAX_QUESTION_LENGTH } from "@/lib/career-assistant";

const SUGGESTED_PROMPTS = [
  "How should I prepare for this application?",
  "What should I focus on for my upcoming interview?",
  "How can I improve my chances for this role?",
  "What skills should I strengthen?",
  "Give me a concise career action plan.",
];

export type AssistantApplicationContext = {
  id: number;
  jobTitle: string;
  companyName: string;
};

export function CareerAssistant({
  applicationContext,
}: {
  applicationContext?: AssistantApplicationContext;
}) {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const trimmedLength = question.trim().length;
  const canSubmit = trimmedLength > 0 && trimmedLength <= MAX_QUESTION_LENGTH && !loading;

  async function submit(questionToAsk: string) {
    if (loading) return;
    const trimmed = questionToAsk.trim();
    if (!trimmed || trimmed.length > MAX_QUESTION_LENGTH) return;

    setLoading(true);
    setError(null);
    setReply(null);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          applicationId: applicationContext?.id,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setReply(body.reply as string);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    submit(question);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Sparkles className="size-5 text-primary" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-base font-semibold tracking-tight">Career360 AI Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Ask for help preparing for an application, planning your next steps, or thinking through
            your job search.
          </p>
        </div>
      </div>

      {applicationContext && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <Briefcase className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            Discussing <span className="font-medium">{applicationContext.jobTitle}</span> at{" "}
            <span className="font-medium">{applicationContext.companyName}</span>
          </span>
          <Link
            href="/ai-assistant"
            aria-label="Remove application context"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => setQuestion(prompt)}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Ask a career or job-search question…"
          rows={4}
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setQuestion(e.target.value)}
          aria-label="Your question"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {trimmedLength}/{MAX_QUESTION_LENGTH}
          </span>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            <Send className="size-4" />
            {loading ? "Thinking…" : "Ask Career360 AI"}
          </Button>
        </div>
      </form>

      {loading && <LoadingState label="Career360 AI is thinking…" />}

      {!loading && error && (
        <ErrorState description={error} onRetry={() => submit(question)} />
      )}

      {!loading && !error && reply && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-foreground">{reply}</p>
          </CardContent>
        </Card>
      )}

      {!loading && !error && !reply && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquareText className="size-5 text-muted-foreground" aria-hidden="true" />
            <CardDescription>
              Ask a question above, or try one of the suggested prompts.
            </CardDescription>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
