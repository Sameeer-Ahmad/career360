import type { ReactNode } from "react";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/landing/reveal";

/** Shared chrome for legal documents (Privacy, Terms) — same nav/hero/footer treatment as every other public page, just a single prose column instead of cards. */
export function LegalPageShell({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-background">
      <LandingNav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-[-10%] size-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:py-20 md:px-6">
          <Reveal>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Last updated {lastUpdated}</p>
            <p className="mt-4 text-muted-foreground">{intro}</p>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-border/60 py-16 sm:py-20">
        {/* No Reveal here — the body is taller than one viewport, so a single
            scroll-triggered fade would leave it blank until scrolled into view. */}
        <div className="mx-auto max-w-3xl space-y-10 px-4 md:px-6">{children}</div>
      </section>

      <SiteFooter />
    </div>
  );
}

/** One numbered section — consistent heading/body typography for both legal documents. */
export function LegalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <div id={`section-${number}`}>
      <h2 className="flex items-baseline gap-2.5 text-xl font-semibold tracking-tight text-foreground">
        <span className="text-primary">{number}.</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:hover:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground [&_strong]:font-medium">
        {children}
      </div>
    </div>
  );
}
