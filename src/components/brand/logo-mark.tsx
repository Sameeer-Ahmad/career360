import type { SVGAttributes } from "react";
import { cn } from "@/lib/cn";

// Solid currentColor, not a gradient — keeps per-theme contrast correct
// and reproduces cleanly at favicon size.
export function LogoMark({ className, ...props }: SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary", className)}
      role="img"
      aria-label="Career360"
      {...props}
    >
      <path
        d="M 79.5,32.15 A 34,34 0 1 0 79.5,87.85"
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
      />
      <polyline
        points="50,74 62,62 74,64 92,40"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="74" r="4" fill="currentColor" />
      <circle cx="62" cy="62" r="5.5" fill="currentColor" />
      <circle cx="74" cy="64" r="6.5" fill="currentColor" />
      <circle cx="92" cy="40" r="9" fill="currentColor" />
    </svg>
  );
}
