import type { SVGAttributes } from "react";

/**
 * Career360 icon mark: a "C"-shaped 360° ring broken by an upward arrow,
 * representing continuous career progress. Gradient is fixed (blue → indigo
 * → purple) and intentionally does not change between light/dark themes —
 * only its background container does.
 */
export function LogoMark({ className, ...props }: SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Career360"
      {...props}
    >
      <defs>
        <linearGradient id="career360Mark" x1="10" y1="110" x2="110" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path
        d="M 97.86,67.31 A 38,38 0 1,1 76.06,29.56"
        stroke="url(#career360Mark)"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path d="M 66,90 L 89,31" stroke="url(#career360Mark)" strokeWidth="11" strokeLinecap="round" />
      <polygon points="0,-13 8,9 -8,9" fill="url(#career360Mark)" transform="translate(93,25) rotate(24)" />
      <circle cx="100" cy="14" r="5.5" fill="url(#career360Mark)" />
    </svg>
  );
}
