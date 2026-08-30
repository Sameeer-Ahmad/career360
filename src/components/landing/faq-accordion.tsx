"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/cn";

// Answers are deliberately grounded in what Career360 actually does — never
// a claim beyond the real product.
const FAQ_ITEMS = [
  {
    question: "Does Career360 invent experience or qualifications?",
    answer:
      "No. Career360's AI never invents jobs, skills, achievements, metrics, or education. Every analysis, tailored resume, and generated cover letter is grounded strictly in the resume and job description you provide — if something isn't there, it gets left out rather than made up.",
  },
  {
    question: "How does the job/ATS match score work?",
    answer:
      "When you run Resume Analysis against a job description, Career360 breaks the role's requirements down and classifies each one as Matched, Weak, or Missing based on what your resume actually shows — then scores keyword alignment, required-skill coverage, experience and project relevance, and resume structure to give you an overall picture of fit.",
  },
  {
    question: "Can I edit the generated resume?",
    answer:
      "Yes. Tailored resumes, cover letters, and every other AI-generated draft are fully editable. Career360 always hands you a starting point — you review and adjust it before it's ever sent anywhere.",
  },
  {
    question: "How does the AI use my resume and job description?",
    answer:
      "Your resume and the job description are the only source of truth the AI is given. It reads them to identify relevant skills and draft content grounded in what's actually there — it never adds claims, employers, or achievements beyond what you've written.",
  },
  {
    question: "What does Career360 do with my resume data?",
    answer:
      "When you upload a resume, Career360 extracts and stores the text — never the raw file — so it can power Resume Analysis, tailoring, and cover letter generation. That text is sent to Career360's AI providers only to generate those results for you; it's never sold or shared with employers.",
  },
  {
    question: "Can Career360 help me prepare for interviews?",
    answer:
      "Yes. Career360 tracks upcoming interviews alongside each application, with optional Google Calendar sync so reminders show up where you already look. Job Analysis also breaks down the skills and topics a role's interview process is likely to focus on, and the AI Assistant is available for interview-prep questions.",
  },
];

function FaqItem({ question, answer, delayMs }: { question: string; answer: string; delayMs: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerId = useId();

  return (
    <Reveal delayMs={delayMs}>
      <div
        className={cn(
          "group rounded-xl border bg-card shadow-card transition-colors",
          open ? "border-primary/40" : "border-border",
          "hover:border-primary/40 focus-within:border-primary/40",
        )}
      >
        <h3 className="m-0">
          <button
            type="button"
            id={triggerId}
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-4 rounded-xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:px-6 sm:py-5"
          >
            <span className="text-base font-semibold text-foreground">{question}</span>
            <Plus
              className={cn(
                "size-5 shrink-0 transition-[color,transform] duration-300 ease-in-out",
                open
                  ? "rotate-45 text-primary"
                  : "text-muted-foreground group-hover:text-primary group-focus-within:text-primary",
              )}
              aria-hidden="true"
            />
          </button>
        </h3>

        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className={cn(
            "grid transition-[grid-template-rows] duration-300 ease-in-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="overflow-hidden">
            <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-6 sm:pb-5">{answer}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/** Compact FAQ accordion — each row independently expandable, smooth height transition, no JS-measured pixel heights (CSS grid-template-rows 0fr/1fr trick). */
export function FaqAccordion() {
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, index) => (
        <FaqItem key={item.question} question={item.question} answer={item.answer} delayMs={index * 60} />
      ))}
    </div>
  );
}
