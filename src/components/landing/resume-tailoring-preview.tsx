import { Sparkles } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const MATCH_ROWS = [
  { requirement: "React", status: "Matched", dotClassName: "bg-status-offer-fg" },
  { requirement: "System Design", status: "Weak", dotClassName: "bg-status-screening-fg" },
  { requirement: "GraphQL", status: "Missing", dotClassName: "bg-status-rejected-fg" },
];

/** A resume bullet rewritten in place (before → after), plus the real MATCHED/WEAK/MISSING vocabulary Resume Analysis actually uses — a rewrite-in-a-document metaphor rather than a generic diagram. */
export function ResumeTailoringPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-3 -z-10 rounded-2xl bg-gradient-to-bl from-primary/10 to-transparent blur-xl" aria-hidden="true" />

      <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Resume — Experience</p>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Frontend Engineer, Acamae (2021–2024)</p>
          <Reveal className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-foreground/60 line-through decoration-status-rejected-fg/50">
            Worked on backend services for the platform team.
          </Reveal>

          <Reveal delayMs={150} className="relative rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-foreground">
            <span className="pointer-events-none absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
              <Sparkles className="size-2.5" aria-hidden="true" />
              Tailored
            </span>
            Built and maintained backend services powering Acamae&apos;s core product, working closely with the
            platform team.
          </Reveal>
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">Requirement match</p>
          {MATCH_ROWS.map((row) => (
            <div key={row.requirement} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-foreground">{row.requirement}</span>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`size-1.5 rounded-full ${row.dotClassName}`} aria-hidden="true" />
                {row.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
