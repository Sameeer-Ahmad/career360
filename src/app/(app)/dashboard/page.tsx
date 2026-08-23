import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bookmark,
  Briefcase,
  CalendarClock,
  MessageSquareText,
  Send,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { auth } from "@/auth";
import { listApplications } from "@/lib/applications";
import { computeMonthlyTrend, computeStatusStats } from "@/lib/dashboard-stats";
import { Header } from "@/components/shell/header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";
import { ApplicationsTrendChart } from "@/components/dashboard/applications-trend-chart";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const applications = await listApplications(Number(session.user.id));
  const recentApplications = applications.slice(0, 4);
  const stats = computeStatusStats(applications);
  const trend = computeMonthlyTrend(applications);

  const statCards = [
    { label: "Total Applications", value: stats.total, icon: Briefcase },
    { label: "Active", value: stats.active, icon: Send },
    { label: "Interviews", value: stats.interviews, icon: CalendarClock },
    { label: "Offers", value: stats.offers, icon: TrendingUp },
    { label: "Rejected", value: stats.rejected, icon: XCircle },
    { label: "Wishlist", value: stats.wishlist, icon: Bookmark },
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {statCards.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Applications over time</CardTitle>
                <CardDescription>Applications submitted per month, last 6 months.</CardDescription>
              </CardHeader>
              <CardContent>
                <ApplicationsTrendChart data={trend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent applications</CardTitle>
                <CardDescription>Your latest activity across all pipelines.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {recentApplications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No applications yet. Add your first one to see it here.
                  </p>
                ) : (
                  recentApplications.map((app, index) => (
                    <div key={app.id}>
                      <Link
                        href={`/applications/${app.id}`}
                        className="flex items-center justify-between gap-3 rounded-md py-2.5 transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{app.jobTitle}</p>
                          <p className="truncate text-xs text-muted-foreground">{app.company.name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {app.priority && <PriorityBadge priority={app.priority} />}
                          <StatusBadge status={app.status} />
                        </div>
                      </Link>
                      {index < recentApplications.length - 1 && <Divider />}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Link href="/applications" className={buttonVariants("outline", "sm")}>
                  View all applications
                </Link>
                <Link href="/companies" className={buttonVariants("outline", "sm")}>
                  Browse companies
                </Link>
                <Link href="/calendar" className={buttonVariants("outline", "sm")}>
                  Upcoming interviews
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly goal</CardTitle>
                <CardDescription>5 applications submitted / 8 goal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[62%] rounded-full bg-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" aria-hidden="true" />
                  <CardTitle>AI Assistant</CardTitle>
                </div>
                <CardDescription>
                  Ask career and job-search questions. Deeper prep and skill-gap insights are coming soon.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/ai-assistant" className={cn(buttonVariants("secondary", "sm"), "w-full")}>
                  <MessageSquareText className="size-4" />
                  Ask the assistant
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
