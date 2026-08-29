"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

// Traceable to the assistant's own real suggested prompts
// (src/components/ai-assistant/career-assistant.tsx) — this mockup never
// claims a capability the AI Assistant doesn't actually have.
const RESPONSE_POINTS = [
  "Focus on system design fundamentals — this role leans heavily on scalability questions.",
  "Be ready to walk through 2–3 recent projects in depth, including the tradeoffs you made.",
  "Review the must-have skills in the job description and prepare one concrete example for each.",
  "A matching System Design learning path is ready if you want structured prep.",
];

export function AiConversation() {
  const [stage, setStage] = useState<"idle" | "thinking" | "answered">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function startSequence() {
    if (stage !== "idle") return;
    setStage("thinking");
    timeoutRef.current = setTimeout(() => setStage("answered"), 1100);
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">AI Assistant</span>
      </div>

      <Reveal onVisible={startSequence} className="space-y-3 pt-3">
        <p className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-3.5 py-2.5 text-sm text-primary-foreground">
          How should I prepare for this interview?
        </p>

        {stage === "thinking" && (
          <div className="flex w-fit items-center gap-1 rounded-lg rounded-tl-sm bg-muted px-3.5 py-3" aria-live="polite" aria-label="AI Assistant is responding">
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
          </div>
        )}

        {stage === "answered" && (
          <div className="max-w-[92%] rounded-lg rounded-tl-sm bg-muted px-3.5 py-3 text-sm text-foreground">
            <p className="mb-2">Here&apos;s how to prepare for this interview:</p>
            <ul className="space-y-1.5">
              {RESPONSE_POINTS.map((point) => (
                <li key={point} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 text-primary">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Reveal>
    </div>
  );
}
