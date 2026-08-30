import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/** Shared visual shell for /login, /signup, and /forgot-password — same ambient glow/card treatment as the landing page, kept in one place so the three stay visually consistent. */
export function AuthShell({
  title,
  description,
  children,
  footer,
  showBackLink = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  /** "Back to Career360" text link, top-left — opt-in per page (currently /login and /signup only). */
  showBackLink?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-0 size-[560px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
      </div>

      {/* z-20 keeps the theme dropdown above the content block below it
          (z-10), so it stays clickable when it opens downward. */}
      <div className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6">
        {showBackLink ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to Career360
          </Link>
        ) : (
          <span />
        )}
        <ThemeToggle />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-10 pt-2">
        <Link
          href="/"
          aria-label="Career360 home"
          className="mb-6 rounded-md transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Logo markClassName="size-8" showTagline />
        </Link>

        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-card sm:p-8">
          <div className="mb-5 space-y-1 text-center">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {children}
        </div>

        {footer && <div className="mt-4 text-sm text-muted-foreground">{footer}</div>}
      </div>
    </main>
  );
}
