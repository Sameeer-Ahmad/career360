"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import { Briefcase, MessageSquareText, Plus, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/cn";
import { MAX_QUESTION_LENGTH, type ChatMessage } from "@/lib/career-assistant";

const SUGGESTED_PROMPTS = [
  "How should I prepare for this application?",
  "What should I focus on for my upcoming interview?",
  "How can I improve my chances for this role?",
  "What skills should I strengthen?",
  "Give me a concise career action plan.",
];

// react-markdown's Components type requires each renderer to accept a `node`
// prop (the mdast node); we never need it, only the rest of the DOM props.
/* eslint-disable @typescript-eslint/no-unused-vars */
const markdownComponents: Components = {
  h1: ({ node, ...props }) => <h3 className="mb-1 mt-3 text-sm font-semibold text-foreground first:mt-0" {...props} />,
  h2: ({ node, ...props }) => <h3 className="mb-1 mt-3 text-sm font-semibold text-foreground first:mt-0" {...props} />,
  h3: ({ node, ...props }) => <h4 className="mb-1 mt-3 text-sm font-semibold text-foreground first:mt-0" {...props} />,
  p: ({ node, ...props }) => <p className="mb-2 leading-relaxed last:mb-0" {...props} />,
  ul: ({ node, ...props }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0" {...props} />,
  ol: ({ node, ...props }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0" {...props} />,
  li: ({ node, ...props }) => <li {...props} />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
  code: ({ node, ...props }) => (
    <code className="rounded bg-background px-1 py-0.5 font-mono text-xs" {...props} />
  ),
  pre: ({ node, ...props }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-background p-2 text-xs last:mb-0" {...props} />
  ),
  a: ({ node, ...props }) => (
    <a className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
  ),
};
/* eslint-enable @typescript-eslint/no-unused-vars */

export type AssistantApplicationContext = {
  id: number;
  jobTitle: string;
  companyName: string;
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {!isUser && (
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <Markdown components={markdownComponents}>{message.content}</Markdown>
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-1 rounded-lg bg-muted px-3 py-2.5" role="status" aria-label="Career360 AI is typing">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
      </div>
    </div>
  );
}

export function CareerAssistant({
  applicationContext,
}: {
  applicationContext?: AssistantApplicationContext;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const trimmedLength = input.trim().length;
  const canSubmit = trimmedLength > 0 && trimmedLength <= MAX_QUESTION_LENGTH && !loading;

  async function sendMessages(conversation: ChatMessage[]) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: conversation,
          applicationId: applicationContext?.id,
        }),
      });

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? "Something went wrong. Please try again.");
        return;
      }

      setMessages([...conversation, { role: "assistant", content: body.reply as string }]);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    const conversation: ChatMessage[] = [...messages, { role: "user", content: input.trim() }];
    setMessages(conversation);
    setInput("");
    sendMessages(conversation);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) handleSubmit(event);
    }
  }

  function handleRetry() {
    // The failed user turn is already the last entry in `messages` — resend as-is.
    sendMessages(messages);
  }

  function handleNewConversation() {
    setMessages([]);
    setInput("");
    setError(null);
  }

  const showEmptyState = messages.length === 0 && !loading;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
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
        {messages.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={handleNewConversation}>
            <Plus className="size-4" />
            New Conversation
          </Button>
        )}
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

      {applicationContext && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Looking for a structured breakdown of this role instead?{" "}
          <Link
            href={`/job-analysis?applicationId=${applicationContext.id}`}
            className="text-primary hover:underline"
          >
            Try Job Analysis
          </Link>
          .
        </p>
      )}

      <div className="min-h-[16rem] max-h-[60vh] space-y-4 overflow-y-auto rounded-lg border border-border p-4">
        {showEmptyState ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <MessageSquareText className="size-5 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              Ask a question below, or try one of the suggested prompts.
            </p>
          </div>
        ) : (
          messages.map((message, index) => <MessageBubble key={index} message={message} />)
        )}

        {loading && <TypingIndicator />}

        {error && <ErrorState description={error} onRetry={handleRetry} className="border-0 px-0 py-4" />}

        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Ask a career or job-search question…"
          rows={3}
          value={input}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Your question"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {trimmedLength}/{MAX_QUESTION_LENGTH}
          </span>
          <Button type="submit" size="sm" disabled={!canSubmit}>
            <Send className="size-4" />
            {loading ? "Sending…" : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}
