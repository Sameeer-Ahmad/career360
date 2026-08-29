"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { ApplicationStatus, EmploymentType, Priority } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EMPLOYMENT_TYPE_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/format";
import { APPLICATION_SORTS, type ApplicationSort } from "@/lib/applications/application-sort";

const STATUSES = Object.keys(STATUS_LABELS) as ApplicationStatus[];
const PRIORITIES = Object.keys(PRIORITY_LABELS) as Priority[];
const EMPLOYMENT_TYPES = Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[];

const SORT_LABELS: Record<ApplicationSort, string> = {
  appliedDesc: "Applied date (newest first)",
  appliedAsc: "Applied date (oldest first)",
  titleAsc: "Job title (A–Z)",
  titleZa: "Job title (Z–A)",
  companyAsc: "Company (A–Z)",
  priority: "Priority (high to low)",
  updatedDesc: "Recently updated",
};

export function ApplicationsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  // Stay in sync if the URL changes from elsewhere (e.g. browser back/forward).
  // This project's lint config forbids both the effect+setState pattern and the
  // ref-during-render alternative React's docs otherwise recommend for this case
  // (see src/components/theme/theme-provider.tsx for the same tradeoff).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchInput(searchParams.get("q") ?? "");
  }, [searchParams]);

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  // Debounce the search box so typing doesn't push a URL update on every keystroke.
  useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (searchInput === current) return;
    const timeout = setTimeout(() => setParam("q", searchInput), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const employmentType = searchParams.get("employmentType") ?? "";
  const sort = searchParams.get("sort") ?? "";

  const hasActiveFilters = Boolean(searchParams.get("q") || status || priority || employmentType || sort);

  function clearAll() {
    setSearchInput("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder="Search by job title or company…"
          aria-label="Search applications"
          className="pl-8"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-36">
          <Select aria-label="Filter by status" value={status} onChange={(e) => setParam("status", e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-32">
          <Select aria-label="Filter by priority" value={priority} onChange={(e) => setParam("priority", e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-40">
          <Select
            aria-label="Filter by employment type"
            value={employmentType}
            onChange={(e) => setParam("employmentType", e.target.value)}
          >
            <option value="">All employment types</option>
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMPLOYMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-48">
          <Select aria-label="Sort applications" value={sort} onChange={(e) => setParam("sort", e.target.value)}>
            <option value="">Applied date (newest first)</option>
            {APPLICATION_SORTS.filter((s) => s !== "appliedDesc").map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>

        {hasActiveFilters && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
