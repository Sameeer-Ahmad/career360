import type { ComponentType, ReactNode } from "react";
import { Briefcase, CalendarClock, CalendarDays, FileText, GraduationCap, Send, Sparkles, TrendingUp } from "lucide-react";
import { Badge, PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

/**
 * Static illustrative mockups for the marketing page — built from the
 * real Career360 UI primitives (Badge/StatusBadge/PriorityBadge, the same
 * status color tokens the authenticated app uses) so this looks like an
 * actual product screenshot rather than an unrelated decorative graphic.
 * All example content here is clearly illustrative, not real user data.
 */

function BrowserFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card shadow-card", className)}>
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-3 py-2.5">
        <span className="size-2.5 rounded-full bg-status-rejected-fg/60" />
        <span className="size-2.5 rounded-full bg-status-screening-fg/60" />
        <span className="size-2.5 rounded-full bg-status-offer-fg/60" />
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-1 text-lg font-bold tracking-tight text-foreground">{value}</p>
    </div>
  );
}

/** The hero's primary visual — a condensed Dashboard glimpse. */
export function HeroPreview() {
  return (
    <BrowserFrame>
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid grid-cols-3 gap-2.5">
          <MiniStat label="Applications" value="18" icon={Briefcase} />
          <MiniStat label="Active" value="9" icon={Send} />
          <MiniStat label="Interviews" value="3" icon={CalendarClock} />
        </div>

        <div className="rounded-lg border border-border bg-background p-3.5">
          <p className="mb-2.5 text-xs font-medium text-muted-foreground">What&apos;s next</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="primary" className="mb-1">
                  Interview
                </Badge>
                <p className="truncate text-sm font-medium text-foreground">Acamae · SDE 1</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">Tomorrow · 2:00 PM</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Badge variant="info" className="mb-1">
                  Follow-up
                </Badge>
                <p className="truncate text-sm font-medium text-foreground">Northwind Labs</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">Fri · 11:00 AM</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Sparkles className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">AI Assistant:</span> &ldquo;Here&apos;s how to prepare for
            your interview at Acamae…&rdquo;
          </p>
        </div>
      </div>
    </BrowserFrame>
  );
}

// Anchored just outside all four corners (negative top/bottom keeps them
// clear of the card's own content — the stat row and "What's next" list
// sit close enough to the edges that anything less than a full corner
// offset clips real text underneath).
const FLOATING_BADGES: { icon: ComponentType<{ className?: string }>; label: string; position: string; floatDelay: string }[] = [
  { icon: Briefcase, label: "Application added", position: "-left-6 -top-4 sm:-left-10 sm:-top-5", floatDelay: "0s" },
  { icon: CalendarDays, label: "Interview scheduled", position: "-right-4 -top-4 sm:-right-10 sm:-top-5", floatDelay: "1.1s" },
  { icon: FileText, label: "Resume tailored", position: "-left-6 -bottom-4 sm:-left-10 sm:-bottom-5", floatDelay: "2.2s" },
  { icon: GraduationCap, label: "Learning path created", position: "-right-4 -bottom-4 sm:-right-10 sm:-bottom-5", floatDelay: "0.6s" },
];

/** The hero's headline visual — the Dashboard glimpse plus small floating cards naming real product actions, communicating the workflow at a glance. Floating badges are hidden below sm: not enough room, and it'd risk horizontal overflow on narrow screens. */
export function HeroVisual() {
  return (
    <div className="relative">
      <HeroPreview />
      {FLOATING_BADGES.map((badge) => (
        <div
          key={badge.label}
          className={cn(
            "pointer-events-none absolute hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground shadow-card sm:flex",
            badge.position,
          )}
          style={{ animation: `landing-float 6s ease-in-out ${badge.floatDelay} infinite` }}
          aria-hidden="true"
        >
          <badge.icon className="size-3.5 text-primary" aria-hidden="true" />
          {badge.label}
        </div>
      ))}
    </div>
  );
}

/** The showcase section's four illustrative panels. */
export function ShowcaseDashboard() {
  return (
    <div className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <MiniStat label="Total Applications" value="18" icon={Briefcase} />
        <MiniStat label="Offers" value="2" icon={TrendingUp} />
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex items-end gap-1.5">
          {[40, 65, 45, 80, 60, 90].map((height, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-primary/70" style={{ height: `${height * 0.4}px` }} />
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">Applications over time</p>
      </div>
    </div>
  );
}

export function ShowcaseApplications() {
  const rows = [
    { title: "Frontend Engineer", company: "Acamae", date: "Applied Mar 12", status: "INTERVIEW" as const, priority: "HIGH" as const },
    { title: "Platform Engineer", company: "Northwind Labs", date: "Applied Mar 8", status: "APPLIED" as const, priority: "MEDIUM" as const },
    { title: "Product Designer", company: "Fieldstone", date: "Applied Feb 27", status: "SCREENING" as const, priority: null },
    { title: "Backend Engineer", company: "Fieldstone", date: "Wishlist", status: "WISHLIST" as const, priority: "LOW" as const },
  ];
  return (
    <div className="space-y-2 p-4">
      {rows.map((row) => (
        <div key={row.title} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.company} · {row.date}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {row.priority && <PriorityBadge priority={row.priority} />}
            <StatusBadge status={row.status} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShowcaseApplicationDetail() {
  return (
    <div className="space-y-3 p-4">
      <div>
        <p className="text-sm font-semibold text-foreground">Frontend Engineer</p>
        <p className="text-xs text-muted-foreground">Acamae</p>
        <div className="mt-2 flex items-center gap-1.5">
          <StatusBadge status="INTERVIEW" />
          <PriorityBadge priority="HIGH" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-xs font-medium text-muted-foreground">Follow-ups</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-foreground">Follow up with Acamae interview</span>
          <span className="text-muted-foreground">11:30 PM</span>
        </div>
      </div>
      <div className="rounded-lg border border-border bg-background p-3">
        <p className="text-xs font-medium text-muted-foreground">Learning paths</p>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-foreground">System Design fundamentals</span>
          <span className="text-muted-foreground">6 topics</span>
        </div>
      </div>
    </div>
  );
}

export function ShowcaseCalendar() {
  const events = [
    { label: "Interview", title: "Acamae · SDE 1", when: "Tomorrow, 2:00 PM", variant: "primary" as const },
    { label: "Follow-up", title: "Northwind Labs", when: "Fri, 11:00 AM", variant: "info" as const },
    { label: "Learning Session", title: "System Design", when: "Fri, 7:00 PM", variant: "neutral" as const },
  ];
  return (
    <div className="space-y-2 p-4">
      {events.map((event) => (
        <div key={event.title} className="rounded-lg border border-border bg-background p-3">
          <div className="flex items-center gap-2">
            <Badge variant={event.variant}>{event.label}</Badge>
            <p className="truncate text-sm font-medium text-foreground">{event.title}</p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{event.when}</p>
        </div>
      ))}
    </div>
  );
}

export function ShowcasePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <BrowserFrame>
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
      </div>
      {children}
    </BrowserFrame>
  );
}
