"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// Fade+translate entrance on scroll into view via IntersectionObserver.
// prefers-reduced-motion is handled globally (globals.css), so no branching needed here.
const VARIANT_CLASSES = {
  fade: { hidden: "translate-y-6 opacity-0", visible: "translate-y-0 opacity-100" },
  "grow-x": { hidden: "scale-x-0 opacity-0 origin-left", visible: "scale-x-100 opacity-100 origin-left" },
  "grow-y": { hidden: "scale-y-0 opacity-0 origin-top", visible: "scale-y-100 opacity-100 origin-top" },
} as const;

export function Reveal({
  children,
  className,
  delayMs = 0,
  variant = "fade",
  onVisible,
}: {
  /** Optional — connector lines (variant="grow-x"/"grow-y") are empty visual bars with no content. */
  children?: ReactNode;
  className?: string;
  /** Stagger multiple Reveals in the same group by giving each an increasing delay. */
  delayMs?: number;
  /** "fade" for content/cards; "grow-x"/"grow-y" for connector lines that should visually "draw" between steps. */
  variant?: keyof typeof VARIANT_CLASSES;
  /** Fires once, the first time this enters the viewport — lets a parent (e.g. the AI conversation mockup) sequence its own follow-up state instead of re-implementing observer logic. */
  onVisible?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onVisible is expected to be stable enough per call site; re-subscribing on every render would defeat the one-shot disconnect
  }, []);

  const states = VARIANT_CLASSES[variant];
  return (
    <div
      ref={ref}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
      className={cn("transition-all duration-700 ease-out", visible ? states.visible : states.hidden, className)}
    >
      {children}
    </div>
  );
}
