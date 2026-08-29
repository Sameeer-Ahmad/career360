import type { SVGAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Career360 icon mark: a ring gapped on the right (both the top-left and
 * bottom-right arcs stay clearly visible, rounded caps on each end), with
 * a small ascending growth-graph — three points inside the ring rising to
 * a fourth, emphasized point that breaks past the ring's own outer edge
 * through that gap — career progress, breaking out.
 *
 * Solid `currentColor` throughout (no gradient) — defaults to `text-primary`
 * below, so it automatically picks up the correct per-theme emerald shade
 * the same way every other icon in the app does (contrast-checked against
 * both the light and dark page background: a fixed mid-tone gradient
 * previously dropped under 2:1 against a light background at its
 * brightest stop — solid, theme-aware color fixes that). A gradient also
 * doesn't reproduce cleanly at favicon size, the other reason to drop it.
 */
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
