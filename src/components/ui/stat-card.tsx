import type { ComponentType } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  iconClassName,
}: {
  label: string;
  value: string | number;
  icon?: ComponentType<{ className?: string }>;
  /** Small helper line under the value, e.g. "+3 this week". Purely presentational. */
  trend?: string;
  className?: string;
  /** Overrides the icon box's background/text color — e.g. tying a stat to its matching status color. Defaults to the standard primary tint. */
  iconClassName?: string;
}) {
  return (
    <Card className={cn("flex h-full flex-col justify-between gap-3 p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <div className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", iconClassName ?? "bg-primary/10 text-primary")}>
            <Icon className="size-4.5" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
        {trend && <p className="text-xs text-muted-foreground">{trend}</p>}
      </div>
    </Card>
  );
}
