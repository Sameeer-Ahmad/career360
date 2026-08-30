import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Pure-CSS hover/focus tooltip — no client JS needed. */
export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: {
  content: string;
  children: ReactNode;
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs text-background opacity-0 shadow-popover transition-opacity delay-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
