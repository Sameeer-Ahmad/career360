import type { ComponentType } from "react";
import { Reveal } from "@/components/landing/reveal";

export type ProductStoryStep = {
  number: string;
  verb: string;
  feature: string;
  icon: ComponentType<{ className?: string }>;
};

/**
 * The six-step product story, as a deterministic 3-column grid (2 rows of
 * 3) — the same grid pattern the "How Career360 works" section below it
 * uses for its 3 steps. A flex-wrap row of 6 fixed-width cards used to
 * leave a lone 6th card stranded alone on its own row once the container
 * ran out of width for it; a grid guarantees full, even rows instead.
 */
export function ProductStory({ steps }: { steps: ProductStoryStep[] }) {
  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
      {steps.map((step, index) => (
        <Reveal key={step.number} delayMs={index * 80}>
          <div
            tabIndex={0}
            className="group flex h-full w-full flex-col items-center gap-2.5 rounded-xl border border-border bg-card px-4 py-5 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-popover focus-visible:-translate-y-1 focus-visible:border-primary/50 focus-visible:shadow-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="text-xs font-bold tracking-wide text-primary/70 transition-colors group-hover:text-primary group-focus-visible:text-primary">
              {step.number}
            </span>
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20 group-focus-visible:bg-primary/20">
              <step.icon className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{step.verb}</p>
              <p className="text-xs text-muted-foreground">{step.feature}</p>
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}
