"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Application, ApplicationStatus, Company } from "@prisma/client";
import { StatusBadge } from "@/components/ui/badge";
import { buildApplicationSlug } from "@/lib/applications/application-slug";
import { cn } from "@/lib/cn";

type ApplicationResult = Pick<Application, "id" | "jobTitle" | "status"> & { company: Pick<Company, "name"> };

// Reuses the same /api/applications?q= search ApplicationsFilterBar uses, so this never duplicates search logic.
const DEBOUNCE_MS = 350;
const MAX_RESULTS = 6;

export function HeaderSearch({
  className,
  autoFocus,
  onNavigate,
}: {
  className?: string;
  /** Focuses the input on mount — used by the mobile search overlay, which opens with nothing else to focus. */
  autoFocus?: boolean;
  /** Called (in addition to closing the dropdown) when a result is clicked — lets the mobile overlay close itself too. */
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApplicationResult[] | null>(null);
  // The query `results` was fetched for, so a still-debouncing keystroke
  // doesn't show a stale flash of the previous query's results.
  const [resultsQuery, setResultsQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
    // Only ever runs once, on mount — intentionally not re-focusing on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const timeout = setTimeout(() => {
      fetch(`/api/applications?q=${encodeURIComponent(trimmed)}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error("search failed"))))
        .then((data: ApplicationResult[]) => {
          setResults(data.slice(0, MAX_RESULTS));
          setResultsQuery(trimmed);
        })
        .catch(() => {
          setResults([]);
          setResultsQuery(trimmed);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [query]);

  function close() {
    setOpen(false);
  }

  function handleResultClick() {
    close();
    onNavigate?.();
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      close();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      close();
      inputRef.current?.blur();
    }
  }

  const trimmedQuery = query.trim();
  const showDropdown = open && trimmedQuery.length > 0;
  const resultsAreCurrent = results !== null && resultsQuery === trimmedQuery;

  return (
    // cn() is a plain join (no tailwind-merge), so className fully replaces the default max-w-sm rather than merging with it.
    <div ref={containerRef} onBlur={handleBlur} className={cn("relative w-full", className ?? "max-w-sm")}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        placeholder="Search applications by job title or company…"
        aria-label="Search applications"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="header-search-results"
        autoComplete="off"
        className="h-9 w-full rounded-md border border-border bg-input pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      />

      {showDropdown && (
        <div
          id="header-search-results"
          // bg-card, not bg-popover — this theme has no --color-popover token.
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-md border border-border bg-card text-card-foreground shadow-popover"
        >
          {!resultsAreCurrent ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : results!.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No applications match &ldquo;{trimmedQuery}&rdquo;.
            </p>
          ) : (
            <ul className="py-1">
              {results!.map((app) => (
                <li key={app.id}>
                  <Link
                    href={`/applications/${buildApplicationSlug(app)}`}
                    onClick={handleResultClick}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{app.jobTitle}</p>
                      <p className="truncate text-xs text-muted-foreground">{app.company.name}</p>
                    </div>
                    <StatusBadge status={app.status as ApplicationStatus} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
