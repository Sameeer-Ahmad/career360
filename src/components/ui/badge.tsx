import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { ApplicationStatus, Priority } from "@prisma/client";
import { PRIORITY_LABELS, STATUS_LABELS, type BadgeVariant } from "@/lib/format";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-status-applied-bg text-status-applied-fg",
  success: "bg-status-offer-bg text-status-offer-fg",
  warning: "bg-status-screening-bg text-status-screening-fg",
  destructive: "bg-status-rejected-bg text-status-rejected-fg",
  info: "bg-status-interview-bg text-status-interview-fg",
};

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  WISHLIST: "bg-status-wishlist-bg text-status-wishlist-fg",
  APPLIED: "bg-status-applied-bg text-status-applied-fg",
  SCREENING: "bg-status-screening-bg text-status-screening-fg",
  INTERVIEW: "bg-status-interview-bg text-status-interview-fg",
  OFFER: "bg-status-offer-bg text-status-offer-fg",
  ACCEPTED: "bg-status-accepted-bg text-status-accepted-fg",
  REJECTED: "bg-status-rejected-bg text-status-rejected-fg",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ApplicationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY_CLASSES: Record<Priority, string> = {
  LOW: "bg-priority-low-bg text-priority-low-fg",
  MEDIUM: "bg-priority-medium-bg text-priority-medium-fg",
  HIGH: "bg-priority-high-bg text-priority-high-fg",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        PRIORITY_CLASSES[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
