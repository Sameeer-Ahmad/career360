import { BookOpen, Check, Circle, Target } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const SKILL_GAPS = [
  { skill: "System Design", level: "Just getting started" },
  { skill: "GraphQL", level: "Familiar" },
];

const LEARNING_PATH = [
  { topic: "System Design fundamentals", priority: "High priority" },
  { topic: "GraphQL basics", priority: "Medium priority" },
];

const PROGRESS = [
  { topic: "System Design fundamentals", state: "done" as const },
  { topic: "GraphQL basics", state: "in-progress" as const },
  { topic: "Distributed caching", state: "not-started" as const },
];

function Panel({
  icon: Icon,
  title,
  children,
  delayMs,
}: {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
  delayMs?: number;
}) {
  return (
    <Reveal delayMs={delayMs} className="w-full max-w-sm">
      <div className="rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="size-3.5" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
        </div>
        {children}
      </div>
    </Reveal>
  );
}

/** Skill gaps -> Learning Path -> Progress, as three connected mini-panels — a vertical journey with real content in each stage, distinct from a horizontal icon-only step flow. */
export function LearningJourney() {
  return (
    <div className="flex flex-col items-center gap-3">
      <Panel icon={Target} title="Skill gaps">
        <div className="space-y-2">
          {SKILL_GAPS.map((item) => (
            <div key={item.skill} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-foreground">{item.skill}</span>
              <span className="text-xs text-muted-foreground">{item.level}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Reveal variant="grow-y" delayMs={100} className="h-6 w-px bg-gradient-to-b from-primary/70 to-primary/10" />

      <Panel icon={BookOpen} title="Learning Path" delayMs={120}>
        <div className="space-y-2">
          {LEARNING_PATH.map((item) => (
            <div key={item.topic} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span className="text-foreground">{item.topic}</span>
              <span className="text-xs text-muted-foreground">{item.priority}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Reveal variant="grow-y" delayMs={220} className="h-6 w-px bg-gradient-to-b from-primary/70 to-primary/10" />

      <Panel icon={Check} title="Progress" delayMs={240}>
        <div className="space-y-2">
          {PROGRESS.map((item) => (
            <div key={item.topic} className="flex items-center gap-2.5 text-sm">
              {item.state === "done" && <Check className="size-4 shrink-0 text-status-offer-fg" aria-hidden="true" />}
              {item.state === "in-progress" && <Circle className="size-4 shrink-0 fill-primary/30 text-primary" aria-hidden="true" />}
              {item.state === "not-started" && <Circle className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className={item.state === "not-started" ? "text-muted-foreground" : "text-foreground"}>
                {item.topic}
              </span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
