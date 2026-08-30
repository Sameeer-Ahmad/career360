import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/landing/reveal";
import { ResourcesGrid } from "@/components/landing/resources-grid";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export default function ResourcesPage() {
  return (
    <div className="bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute left-1/2 top-[-10%] size-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:py-20 md:px-6">
          <Reveal>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Resources</h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Practical guidance for each part of the job search — and how Career360 helps with it.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <ResourcesGrid />
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <Reveal>
            <Card className="relative overflow-hidden border-primary/30 bg-primary/5 px-6 py-12 sm:px-14">
              <div
                className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Ready to put this into practice?
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                  Career360 brings applications, analysis, resumes, cover letters, learning, and your calendar into
                  one connected workspace.
                </p>
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/signup" className={cn(buttonVariants("primary", "lg"), "gap-2")}>
                    Get Started
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link href="/" className={buttonVariants("outline", "lg")}>
                    Back to Career360
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
