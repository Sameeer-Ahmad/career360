import type { ApplicationStatus } from "@prisma/client";

type ApplicationLike = { status: ApplicationStatus; appliedAt: Date | null };

const ACTIVE_STATUSES = new Set<ApplicationStatus>(["APPLIED", "SCREENING", "INTERVIEW"]);

export function computeStatusStats(applications: ApplicationLike[]) {
  return {
    total: applications.length,
    active: applications.filter((a) => ACTIVE_STATUSES.has(a.status)).length,
    interviews: applications.filter((a) => a.status === "INTERVIEW").length,
    offers: applications.filter((a) => a.status === "OFFER" || a.status === "ACCEPTED").length,
    rejected: applications.filter((a) => a.status === "REJECTED").length,
    wishlist: applications.filter((a) => a.status === "WISHLIST").length,
  };
}

export type MonthlyTrendPoint = { label: string; count: number };

/** Buckets applications by `appliedAt` month, for the last `monthsBack` months (oldest first). */
export function computeMonthlyTrend(applications: ApplicationLike[], monthsBack = 6): MonthlyTrendPoint[] {
  const now = new Date();
  const buckets = Array.from({ length: monthsBack }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1 - i), 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en-US", { month: "short" }),
      count: 0,
    };
  });

  for (const application of applications) {
    if (!application.appliedAt) continue;
    const date = new Date(application.appliedAt);
    const bucket = buckets.find((b) => b.year === date.getFullYear() && b.month === date.getMonth());
    if (bucket) bucket.count++;
  }

  return buckets.map(({ label, count }) => ({ label, count }));
}
