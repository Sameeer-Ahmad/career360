import { ArrowDown, Briefcase, Copy, FileSearch, FileText, RotateCcw, Save } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const INPUT_CHIPS = [
  { icon: Briefcase, label: "Application" },
  { icon: FileSearch, label: "Job Description" },
  { icon: FileText, label: "Resume" },
];

// Illustrative only — never a real user's letter. Deliberately generic and
// clearly a "draft" (ellipsis, muted styling) so it reads as UI preview
// content, not a finished real cover letter.
const DRAFT_LINES = [
  "Dear Hiring Team,",
  "I'm writing to apply for the Frontend Engineer role at Acamae. My experience building React applications lines up closely with what this role needs…",
];

/** The real Cover Letter shape: application + JD + resume in, an editable AI draft out — the user always saves or copies, nothing is auto-sent. */
export function CoverLetterPreview() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {INPUT_CHIPS.map((chip, index) => (
          <Reveal key={chip.label} delayMs={index * 80}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card">
              <chip.icon className="size-3.5 text-primary" aria-hidden="true" />
              {chip.label}
            </span>
          </Reveal>
        ))}
      </div>

      <Reveal variant="grow-y" delayMs={200} className="h-8 w-px bg-gradient-to-b from-primary/70 to-primary/10" />
      <Reveal delayMs={220}>
        <ArrowDown className="size-4 text-muted-foreground" aria-hidden="true" />
      </Reveal>

      <Reveal delayMs={280} className="w-full max-w-md">
        <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-medium text-muted-foreground">AI-generated draft</span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Editable</span>
          </div>
          <div className="space-y-1.5 py-3 text-sm text-foreground">
            {DRAFT_LINES.map((line) => (
              <p key={line} className="text-muted-foreground first:text-foreground">
                {line}
              </p>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground">
              <Save className="size-3.5" aria-hidden="true" />
              Save
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Regenerate
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
              <Copy className="size-3.5" aria-hidden="true" />
              Copy
            </span>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
