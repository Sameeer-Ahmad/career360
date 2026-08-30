import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CalendarClock,
  CalendarDays,
  Check,
  Send,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { getCurrentUser } from "@/lib/account/current-user";
import { listApplications } from "@/lib/applications/applications";
import { computeMonthlyTrend, computeStatusStats } from "@/lib/dashboard/dashboard-stats";
import { getNextActions } from "@/lib/dashboard/dashboard-next-actions";
import { buildApplicationSlug } from "@/lib/applications/application-slug";
import { CALENDAR_EVENT_TYPE_BADGE_VARIANT } from "@/lib/google-calendar/mapping";
import { Header } from "@/components/shell/header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge, StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Divider } from "@/components/ui/divider";
import { formatDate } from "@/lib/format";
import { ApplicationsTrendChart } from "@/components/dashboard/applications-trend-chart";

// Traceable to the assistant's own real suggested prompts
// (src/components/ai-assistant/career-assistant.tsx) — never claims a
// capability that isn't actually implemented.
const AI_ASSISTANT_CAPABILITIES = [
  "Application-specific prep guidance",
  "Interview readiness tips",
  "Skill and experience gap suggestions",
  "Concise career action plans",
];

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [applications, nextActions] = await Promise.all([
    listApplications(user.id),
    getNextActions(user.id),
  ]);
  const recentApplications = applications.slice(0, 4);
  const stats = computeStatusStats(applications);
  const trend = computeMonthlyTrend(applications);
  const firstName = user.name?.trim().split(/\s+/)[0];

  const statCards = [
    { label: "Total Applications", value: stats.total, icon: Briefcase, iconClassName: "bg-primary/10 text-primary" },
    { label: "Active", value: stats.active, icon: Send, iconClassName: "bg-status-applied-bg text-status-applied-fg" },
    { label: "Interviews", value: stats.interviews, icon: CalendarClock, iconClassName: "bg-status-interview-bg text-status-interview-fg" },
    { label: "Offers", value: stats.offers, icon: TrendingUp, iconClassName: "bg-status-offer-bg text-status-offer-fg" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, iconClassName: "bg-status-rejected-bg text-status-rejected-fg" },
    { label: "Wishlist", value: stats.wishlist, icon: Bookmark, iconClassName: "bg-status-wishlist-bg text-status-wishlist-fg" },
  ];

  return (
    <>
      <Header
        title="Dashboard"
        actions={
          <Link href="/applications/new" className={buttonVariants("primary", "sm")}>
            Add Application
          </Link>
        }
      />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h2>
          <p className="text-sm text-muted-foreground">Here&apos;s where your job search stands.</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <CardTitle>What&apos;s next</CardTitle>
                <CardDescription>Your next interviews, follow-ups, and learning sessions.</CardDescription>
              </div>
              <Link href="/calendar" className={buttonVariants("outline", "sm")}>
                View Calendar
              </Link>
            </CardHeader>
            <CardContent className={nextActions.length > 0 ? "space-y-1" : undefined}>
              {nextActions.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="Nothing on the horizon yet"
                  description="Upcoming interviews, follow-ups, and learning sessions will appear here."
                  action={
                    <Link href="/calendar" className={buttonVariants("outline", "sm")}>
                      Open Calendar
                    </Link>
                  }
                  className="py-10"
                />
              ) : (
                nextActions.map((action, index) => (
                  <div key={action.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant={CALENDAR_EVENT_TYPE_BADGE_VARIANT[action.eventType]}>
                            {action.eventTypeLabel}
                          </Badge>
                          <p className="text-xs text-muted-foreground">{action.whenLabel}</p>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">{action.displayTitle}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        {action.applicationHref && (
                          <Link href={action.applicationHref} className={buttonVariants("outline", "sm")}>
                            Open Application
                          </Link>
                        )}
                        {action.learningHref && (
                          <Link href={action.learningHref} className={buttonVariants("outline", "sm")}>
                            Continue Learning
                          </Link>
                        )}
                        <Link href={action.calendarHref} className={buttonVariants("ghost", "sm")}>
                          <CalendarDays className="size-4" aria-hidden="true" />
                          Open in Calendar
                        </Link>
                      </div>
                    </div>
                    {index < nextActions.length - 1 && <Divider />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="relative flex flex-col overflow-hidden border-primary/30 bg-primary/5">
            {/* Purely decorative corner glow — absolutely positioned and
                clipped by the card's own overflow-hidden, so it can never
                sit above or crowd the text/CTA regardless of card width. */}
            <div
              className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl"
              aria-hidden="true"
            />

            <CardHeader>
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Sparkles className="size-4.5" aria-hidden="true" />
                </div>
                <CardTitle>AI Assistant</CardTitle>
              </div>
              <CardDescription>Your career copilot — ask questions and get guidance tailored to you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-1.5">
                {AI_ASSISTANT_CAPABILITIES.map((capability) => (
                  <li key={capability} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{capability}</span>
                  </li>
                ))}
              </ul>
              <Link href="/ai-assistant" className={cn(buttonVariants("primary", "sm"), "w-full")}>
                Talk to Your Career Copilot
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Recent applications</CardTitle>
                <CardDescription>Your latest activity across all pipelines.</CardDescription>
              </div>
              {recentApplications.length > 0 && (
                <Link href="/applications" className="shrink-0 text-xs font-medium text-primary hover:underline">
                  View all
                </Link>
              )}
            </CardHeader>
            <CardContent className={recentApplications.length > 0 ? "space-y-1" : undefined}>
              {recentApplications.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="No applications yet"
                  description="Add your first application to start tracking your job search."
                  action={
                    <Link href="/applications/new" className={buttonVariants("primary", "sm")}>
                      Add Application
                    </Link>
                  }
                  className="py-10"
                />
              ) : (
                recentApplications.map((app, index) => (
                  <div key={app.id}>
                    <Link
                      href={`/applications/${buildApplicationSlug(app)}`}
                      className="flex items-center justify-between gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{app.jobTitle}</p>
                        <p className="truncate text-xs text-muted-foreground">{app.company.name}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {app.appliedAt ? formatDate(app.appliedAt) : "Not applied yet"}
                        </span>
                        <div className="flex items-center gap-2">
                          {app.priority && <PriorityBadge priority={app.priority} />}
                          <StatusBadge status={app.status} />
                        </div>
                      </div>
                    </Link>
                    {index < recentApplications.length - 1 && <Divider />}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Applications over time</CardTitle>
              <CardDescription>Applications submitted per month, last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApplicationsTrendChart data={trend} />
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
