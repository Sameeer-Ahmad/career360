import { ArrowRight, ScanSearch } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

// A job-posting excerpt with a few phrases styled as "detected" — never a
// real posting, just enough document texture to read as a job description
// rather than an abstract diagram.
const DOCUMENT_LINES: (string | { highlight: string })[] = [
  "We're looking for a Frontend Engineer to join our platform team.",
  { highlight: "3+ years of experience with React and TypeScript" },
  "You'll work closely with design and backend to ship product features.",
  { highlight: "Strong understanding of system design and scalability" },
  "Experience mentoring other engineers is a plus.",
];

const DETECTED_SKILLS = ["React", "TypeScript", "System Design"];
const INTERVIEW_FOCUS = ["Scalability", "Frontend architecture"];

/** JD in, real Job Analysis output categories out — a document-with-highlights metaphor instead of a generic flow diagram, since "extraction" is the actual mental model of this feature. */
export function JobAnalysisPreview() {
  return (
    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
      <Reveal className="relative">
        <div className="pointer-events-none absolute -inset-3 -z-10 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent blur-xl" aria-hidden="true" />
        <div className="rounded-xl border border-border bg-card p-5 shadow-card">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Job description</p>
          <div className="space-y-2.5 text-sm leading-relaxed text-muted-foreground">
            {DOCUMENT_LINES.map((line, index) =>
              typeof line === "string" ? (
                <p key={index}>{line}</p>
              ) : (
                <p key={index}>
                  <span className="rounded bg-primary/15 px-1 py-0.5 text-foreground">{line.highlight}</span>
                </p>
              ),
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={120} className="flex justify-center">
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <ArrowRight className="hidden size-5 lg:block" aria-hidden="true" />
          <ArrowRight className="size-5 rotate-90 lg:hidden" aria-hidden="true" />
        </div>
      </Reveal>

      <Reveal delayMs={220}>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-card">
          <div className="mb-3 flex items-center gap-2">
            <ScanSearch className="size-4 text-primary" aria-hidden="true" />
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Career360 analysis</p>
          </div>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Skills detected</p>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {DETECTED_SKILLS.map((skill) => (
              <span key={skill} className="rounded-md bg-card px-2 py-1 text-xs font-medium text-foreground shadow-card">
                {skill}
              </span>
            ))}
          </div>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Interview focus</p>
          <div className="flex flex-wrap gap-1.5">
            {INTERVIEW_FOCUS.map((topic) => (
              <span key={topic} className="rounded-md bg-card px-2 py-1 text-xs font-medium text-foreground shadow-card">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </div>
  );
}
