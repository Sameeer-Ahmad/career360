"use client";

import { useState } from "react";
import { Briefcase, CalendarClock, FileSearch, FileText, GraduationCap, Mail } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

// Practical, generic guidance per topic, each tied to the real Career360
// feature that helps with it — never a claim about a feature that doesn't
// exist (no credits, no browser extension, no invented capabilities).
// Owned by this client component (not passed in as a prop) because a
// Server Component can't pass icon component references across the
// server/client boundary.
//
// `group` is the broader, user-oriented filter category shown in the pill
// bar — deliberately separate from `title` (the specific card heading) so
// several feature-based cards can share one filter without merging their
// content: several single-card categories made the old per-feature filter
// bar feel fragmented, so cards are now grouped by what the user is trying
// to do (Applying / Understanding the Role / Preparing) rather than by
// which Career360 feature covers them.
const RESOURCE_CATEGORIES = [
  {
    icon: FileText,
    title: "Resumes",
    group: "Applying",
    description:
      "A resume should make your relevant experience easy to find in seconds — clear section headers, consistent formatting, and bullets that lead with what you actually did. Resume Analysis checks your resume's structure and compares it against a specific job description, then helps you tailor it without inventing anything that isn't already there.",
  },
  {
    icon: Briefcase,
    title: "Job Applications",
    group: "Applying",
    description:
      "The applications that get responses are usually the ones tracked closely enough that nothing falls through the cracks — knowing exactly which stage each one is in, and when to follow up. Career360's Applications view keeps every company, role, status, and priority in one list instead of scattered spreadsheets.",
  },
  {
    icon: FileSearch,
    title: "Job Analysis",
    group: "Understanding the Role",
    description:
      "Job descriptions bury the requirements that actually matter under a lot of boilerplate. Reading past that — the specific skills, technologies, and interview focus areas a posting is really asking for — is the first step before you touch your resume. Job Analysis breaks a posting down into exactly that.",
  },
  {
    icon: Mail,
    title: "Cover Letters",
    group: "Applying",
    description:
      "A cover letter earns its place by saying something your resume can't — why this role, specifically, makes sense for you. Career360's Cover Letter tool drafts one grounded in your real resume and the job description, which you then edit, save, or copy — nothing is ever sent automatically.",
  },
  {
    icon: CalendarClock,
    title: "Interviews",
    group: "Understanding the Role",
    description:
      "Good interview prep starts with knowing what a role is actually testing for, not generic question banks. Once an interview is scheduled, staying organized around it matters just as much as the prep itself — Career360 tracks interviews alongside each application and can sync them to Google Calendar so reminders show up where you already look.",
  },
  {
    icon: GraduationCap,
    title: "Career Preparation",
    group: "Preparing",
    description:
      "When a job needs skills your resume doesn't show yet, the fastest path forward is a focused plan for exactly that gap, not a generic course catalog. Learning Paths build around the specific skills a role calls for, so you can track progress against something concrete.",
  },
];

const FILTER_GROUPS = ["All", "Applying", "Understanding the Role", "Preparing"];

/** Filter pills + card grid. Client-side filtering only — same static content, just shown/hidden, so there's nothing to fetch and no route/query-param state to keep in sync. */
export function ResourcesGrid() {
  const [active, setActive] = useState<string>("All");
  const visible = active === "All" ? RESOURCE_CATEGORIES : RESOURCE_CATEGORIES.filter((c) => c.group === active);

  return (
    <div>
      <div role="group" aria-label="Filter resources by category" className="flex flex-wrap justify-center gap-2">
        {FILTER_GROUPS.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={active === filter}
            onClick={() => setActive(filter)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active === filter
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((category, index) => (
          <Reveal key={category.title} delayMs={index * 80}>
            <Card className="h-full p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-popover">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <category.icon className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-base font-semibold text-foreground">{category.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{category.description}</p>
            </Card>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
