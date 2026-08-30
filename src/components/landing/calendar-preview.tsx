import { ArrowRight, Bell, Briefcase, CalendarClock, RotateCcw, Send } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
// A static 14-day illustrative grid — day 9 is the interview, day 13 the follow-up.
const DAYS = Array.from({ length: 14 }, (_, i) => i + 1);
const INTERVIEW_DAY = 9;
const FOLLOWUP_DAY = 13;

const LOOP = [
  { icon: Briefcase, label: "Application" },
  { icon: CalendarClock, label: "Interview" },
  { icon: Send, label: "Follow-up" },
  { icon: Bell, label: "Calendar" },
];

/** An actual calendar-grid mockup (not an icon-flow) with the Application <-> Calendar loop underneath — makes the "syncs to Google Calendar" claim visually literal. */
export function CalendarPreview() {
  return (
    <div className="flex flex-col items-center gap-8">
      <Reveal className="relative w-full max-w-xs">
        <div className="pointer-events-none absolute -inset-3 -z-10 rounded-2xl bg-gradient-to-t from-primary/10 to-transparent blur-xl" aria-hidden="true" />
        <div className="rounded-xl border border-border bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">This week</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              Google Calendar
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((day, index) => (
              <span key={index} className="text-[11px] font-medium text-muted-foreground">
                {day}
              </span>
            ))}
            {DAYS.map((day) => (
              <div
                key={day}
                className={
                  day === INTERVIEW_DAY
                    ? "flex aspect-square items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground"
                    : day === FOLLOWUP_DAY
                      ? "relative flex aspect-square items-center justify-center rounded-md border border-primary/40 text-xs font-medium text-foreground"
                      : "flex aspect-square items-center justify-center rounded-md text-xs text-muted-foreground"
                }
              >
                {day}
                {day === FOLLOWUP_DAY && (
                  <span className="pointer-events-none absolute bottom-1 size-1 rounded-full bg-primary" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
            <div className="flex items-center gap-1.5 text-foreground">
              <CalendarClock className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
              Interview — Acamae · SDE 1
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Send className="size-3.5 shrink-0" aria-hidden="true" />
              Follow-up reminder
            </div>
          </div>
        </div>
      </Reveal>

      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
        {LOOP.map((step, index) => (
          <Reveal key={step.label} delayMs={index * 90} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-card">
              <step.icon className="size-3.5 text-primary" aria-hidden="true" />
              {step.label}
            </span>
            {index < LOOP.length - 1 && <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden="true" />}
          </Reveal>
        ))}
        <Reveal delayMs={LOOP.length * 90} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <RotateCcw className="size-3.5" aria-hidden="true" />
          back to Application
        </Reveal>
      </div>
    </div>
  );
}
