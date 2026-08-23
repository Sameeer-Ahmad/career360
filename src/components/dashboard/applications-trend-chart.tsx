import type { MonthlyTrendPoint } from "@/lib/dashboard-stats";

/**
 * Plain CSS bar chart — six months of data doesn't warrant a charting
 * dependency. Bars grow from a fixed-height track so percentage heights
 * resolve correctly regardless of the count/month labels around them.
 */
export function ApplicationsTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const max = Math.max(1, ...data.map((point) => point.count));
  const allZero = data.every((point) => point.count === 0);

  return (
    <div>
      <div
        className="flex items-end gap-2 sm:gap-4"
        role="img"
        aria-label={`Applications per month, last ${data.length} months: ${data
          .map((point) => `${point.label} ${point.count}`)
          .join(", ")}`}
      >
        {data.map((point) => (
          <div key={point.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-foreground">{point.count}</span>
            <div className="flex h-32 w-full items-end">
              <div
                className="w-full rounded-t-sm bg-primary transition-[height]"
                style={{ height: `${Math.max(4, (point.count / max) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{point.label}</span>
          </div>
        ))}
      </div>
      {allZero && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No applications in the last {data.length} months yet.
        </p>
      )}
    </div>
  );
}
