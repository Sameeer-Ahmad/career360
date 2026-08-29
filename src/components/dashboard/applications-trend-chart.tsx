"use client";

import { useState } from "react";
import type { MonthlyTrendPoint } from "@/lib/dashboard/dashboard-stats";

// A hand-rolled SVG chart — six months of real data doesn't warrant a
// charting dependency. viewBox-based sizing keeps it fully responsive
// (CSS width: 100%, no fixed pixel measurements needed for resize).
const WIDTH = 600;
const HEIGHT = 200;
const PADDING_X = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 8;

export function ApplicationsTrendChart({ data }: { data: MonthlyTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((point) => point.count));
  const allZero = data.every((point) => point.count === 0);
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const step = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((point, i) => ({
    ...point,
    x: data.length === 1 ? PADDING_X + plotWidth / 2 : PADDING_X + i * step,
    y: PADDING_TOP + plotHeight - (point.count / max) * plotHeight,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${PADDING_TOP + plotHeight} L ${points[0].x.toFixed(1)} ${PADDING_TOP + plotHeight} Z`
      : "";

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hitWidth = data.length > 0 ? plotWidth / data.length : plotWidth;

  return (
    <div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full"
          role="img"
          aria-label={`Applications per month, last ${data.length} months: ${data
            .map((point) => `${point.label} ${point.count}`)
            .join(", ")}`}
        >
          <defs>
            <linearGradient id="applicationsTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={PADDING_X}
              x2={WIDTH - PADDING_X}
              y1={PADDING_TOP + plotHeight * t}
              y2={PADDING_TOP + plotHeight * t}
              className="stroke-border"
              strokeWidth={1}
            />
          ))}

          {!allZero && <path d={areaPath} fill="url(#applicationsTrendFill)" />}
          <path d={linePath} fill="none" className="stroke-primary" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

          {points.map((point, i) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoverIndex === i ? 5 : 3}
                className={hoverIndex === i ? "fill-primary" : "fill-primary/60"}
                style={{ transition: "r 150ms ease" }}
              />
              {hoverIndex === i && (
                <line
                  x1={point.x}
                  x2={point.x}
                  y1={PADDING_TOP}
                  y2={PADDING_TOP + plotHeight}
                  className="stroke-primary/25"
                  strokeWidth={1}
                />
              )}
              {/* Wide invisible hit target — the visible dot is too small to hover/tap reliably on its own. */}
              <rect
                x={point.x - hitWidth / 2}
                y={PADDING_TOP}
                width={hitWidth}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${point.label}: ${point.count} ${point.count === 1 ? "application" : "applications"}`}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex((current) => (current === i ? null : current))}
                onFocus={() => setHoverIndex(i)}
                onBlur={() => setHoverIndex((current) => (current === i ? null : current))}
                className="cursor-default focus-visible:outline-none"
              />
            </g>
          ))}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-xs shadow-popover"
            style={{ left: `${(hovered.x / WIDTH) * 100}%`, top: `${(hovered.y / HEIGHT) * 100}%` }}
          >
            <p className="font-medium text-foreground">{hovered.label}</p>
            <p className="text-muted-foreground">
              {hovered.count} {hovered.count === 1 ? "application" : "applications"}
            </p>
          </div>
        )}
      </div>

      <div className="mt-1 flex text-xs text-muted-foreground">
        {data.map((point) => (
          <span key={point.label} className="flex-1 text-center">
            {point.label}
          </span>
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
