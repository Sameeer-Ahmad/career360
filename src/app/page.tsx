import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  CalendarClock,
  Check,
  FileSearch,
  Mail,
  Send,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { auth } from "@/auth";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { Reveal } from "@/components/landing/reveal";
import { HeroVisual, ShowcaseApplications, ShowcasePanel } from "@/components/landing/product-preview";
import { ProductStory, type ProductStoryStep } from "@/components/landing/product-story";
import { JobAnalysisPreview } from "@/components/landing/job-analysis-preview";
import { ResumeTailoringPreview } from "@/components/landing/resume-tailoring-preview";
import { CoverLetterPreview } from "@/components/landing/cover-letter-preview";
import { LearningJourney } from "@/components/landing/learning-journey";
import { CalendarPreview } from "@/components/landing/calendar-preview";
import { AiConversation } from "@/components/landing/ai-conversation";
import { FaqAccordion } from "@/components/landing/faq-accordion";

const PRODUCT_STORY: ProductStoryStep[] = [
  { number: "01", verb: "Track", feature: "Applications", icon: Briefcase },
  { number: "02", verb: "Understand", feature: "Job Analysis", icon: FileSearch },
  { number: "03", verb: "Improve", feature: "Resume Analysis & Tailoring", icon: TrendingUp },
  { number: "04", verb: "Prepare", feature: "Cover Letter + Learning", icon: Mail },
  { number: "05", verb: "Interview", feature: "Interview tracking", icon: CalendarClock },
  { number: "06", verb: "Follow Up", feature: "Follow-ups + Calendar", icon: Send },
];

const AI_CAPABILITIES = [
  "Application-specific prep guidance",
  "Interview readiness tips",
  "Skill and experience gap suggestions",
  "Concise career action plans",
];

const HOW_IT_WORKS = [
  {
    number: "01",
    icon: Briefcase,
    title: "Add your applications",
    description: "Capture the role, company, and job details as soon as you find something worth pursuing.",
  },
  {
    number: "02",
    icon: Sparkles,
    title: "Prepare smarter",
    description: "Analyze the job, tailor your resume and cover letter, and close skill gaps with a learning path.",
  },
  {
    number: "03",
    icon: CalendarClock,
    title: "Stay on top of every opportunity",
    description: "Track interviews, follow-ups, and outcomes together, connected to your calendar.",
  },
];

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="bg-background">
      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute left-1/2 top-[-10%] size-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
            style={{ animation: "landing-drift 14s ease-in-out infinite" }}
          />
        </div>

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 sm:py-20 md:px-6 lg:grid-cols-2">
          <Reveal>
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              Applications, prep, interviews, and AI — connected
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Your entire job search, organized in{" "}
              <span className="font-display-italic whitespace-nowrap">one workspace.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Track every application, understand what each job needs, tailor your resume and cover letter, close
              skill gaps, and prepare for interviews — with Calendar and AI support built in, from the first
              application to the offer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={cn(buttonVariants("primary", "lg"), "gap-2")}>
                Get Started
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className={buttonVariants("outline", "lg")}>
                Sign In
              </Link>
            </div>
          </Reveal>

          <Reveal delayMs={150} className="px-4 sm:px-8 lg:px-0">
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* Product story */}
      <section id="features" className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              From application to offer,{" "}
              <span className="font-display-italic whitespace-nowrap">stay in control.</span>
            </h2>
            <p className="mt-3 text-muted-foreground">
              Applications are the center of it all — everything else in Career360 connects back to one.
            </p>
          </Reveal>

          <div className="mt-14">
            <ProductStory steps={PRODUCT_STORY} />
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Know exactly where every application{" "}stands.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Every company, role, status, and priority — tracked in one list, always up to date. No more
                scattered spreadsheets or forgotten tabs.
              </p>
              <Link href="/signup" className={cn(buttonVariants("outline", "md"), "mt-7 gap-2")}>
                Explore Applications
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Reveal>

            <Reveal delayMs={150}>
              <ShowcasePanel title="Applications">
                <ShowcaseApplications />
              </ShowcasePanel>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Job Analysis */}
      <section className="relative overflow-hidden border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileSearch className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Know what a job actually needs, before you apply.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Paste in the job description and Career360 reads it the way a hiring manager would — surfacing the
                skills, technologies, and interview focus areas that actually matter.
              </p>
            </Reveal>

            <Reveal delayMs={150}>
              <JobAnalysisPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* Resume Analysis & Tailoring */}
      <section className="relative overflow-hidden border-t border-border/60 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -left-24 top-1/2 size-96 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <Reveal className="order-2 lg:order-1">
              <ResumeTailoringPreview />
            </Reveal>

            <Reveal delayMs={150} className="order-1 lg:order-2">
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="size-5" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                A resume that speaks to{" "}
                <span className="font-display-italic whitespace-nowrap">this specific role.</span>
              </h2>
              <p className="mt-3 text-muted-foreground">
                Career360 compares your resume against the job description, shows you exactly what&apos;s matched,
                weak, or missing, and rewrites your existing bullets to make the match obvious — never inventing
                experience you don&apos;t have.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Cover Letter */}
      <section className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              A cover letter that&apos;s actually about this{" "}job.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Career360 drafts a cover letter grounded in your real resume and the job description. You review,
              edit, save, or copy it — nothing is ever sent automatically.
            </p>
          </Reveal>

          <div className="mt-12">
            <CoverLetterPreview />
          </div>
        </div>
      </section>

      {/* Learning */}
      <section className="relative overflow-hidden border-t border-border/60 py-20 sm:py-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute -right-24 top-0 size-96 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Know what to learn before the interview{" "}does.
            </h2>
            <p className="mt-3 text-muted-foreground">
              When a job needs skills your resume doesn&apos;t show yet, Career360 turns the gap into a personalized
              learning path — and tracks your progress through it.
            </p>
          </Reveal>

          <div className="mt-14">
            <LearningJourney />
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section id="calendar" className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Every interview and follow-up, on{" "}schedule.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Schedule an interview or follow-up and Career360 syncs it to Google Calendar, closing the loop back to
              the application it came from — reminders show up where you already look.
            </p>
          </Reveal>

          <div className="mt-14">
            <CalendarPreview />
          </div>
        </div>
      </section>

      {/* AI Assistant */}
      <section id="ai-assistant" className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Card className="relative overflow-hidden border-primary/30 bg-primary/5 p-8 sm:p-12">
            <div
              className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/15 blur-3xl"
              aria-hidden="true"
              style={{ animation: "landing-drift 16s ease-in-out infinite" }}
            />
            <div className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <Reveal>
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Sparkles className="size-5" aria-hidden="true" />
                </div>
                <h2 className="mt-5 text-3xl font-bold tracking-tight text-foreground">Your career copilot</h2>
                <p className="mt-3 text-muted-foreground">
                  Career360&apos;s AI Assistant helps you work through your job search — it doesn&apos;t replace the
                  workspace, it helps you use it better.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {AI_CAPABILITIES.map((capability) => (
                    <li key={capability} className="flex items-start gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={cn(buttonVariants("primary", "lg"), "mt-7 gap-2")}>
                  Explore Career360
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Reveal>

              <Reveal delayMs={150}>
                <AiConversation />
              </Reveal>
            </div>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How Career360 <span className="font-display-italic">works</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
            {HOW_IT_WORKS.map((step, index) => (
              <Reveal key={step.number} delayMs={index * 120}>
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <step.icon className="size-5" aria-hidden="true" />
                </div>
                <span className="mt-4 block text-sm font-bold text-primary">{step.number}</span>
                <h3 className="mt-1 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 md:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-muted-foreground">Straight answers about what Career360 actually does.</p>
          </Reveal>

          <div className="mt-10">
            <FaqAccordion />
          </div>

          <Reveal className="mt-8 text-center">
            <p className="mx-auto max-w-xl text-sm text-muted-foreground">
              Want to go deeper? Explore our resources for practical guides on resumes, job applications, interviews,
              and career preparation.{" "}
              <Link
                href="/resources"
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Explore Career360 resources
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60 py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6">
          <Reveal>
            <Card className="relative overflow-hidden border-primary/30 bg-primary/5 px-6 py-14 sm:px-14">
              <div
                className="pointer-events-none absolute left-1/2 top-0 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative">
                <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                  Your next opportunity{" "}deserves{" "}
                  <span className="font-display-italic whitespace-nowrap">a better system.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                  Applications, preparation, interviews, and follow-ups — all in one workspace, always connected.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/signup" className={cn(buttonVariants("primary", "lg"), "gap-2")}>
                    Get Started
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link href="/login" className={buttonVariants("outline", "lg")}>
                    Sign In
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
