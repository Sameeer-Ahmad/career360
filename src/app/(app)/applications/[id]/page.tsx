import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Clock,
  DollarSign,
  ExternalLink,
  FileSearch,
  MapPin,
  Sparkles,
} from "lucide-react";
import { auth } from "@/auth";
import { getApplication, NotFoundError, resolveApplicationId } from "@/lib/applications/applications";
import { listDocumentsForApplication } from "@/lib/documents/documents";
import { getLearningPathDetail, listLearningPaths } from "@/lib/learning/learning";
import { isCalendarConnected } from "@/lib/google-calendar/connection";
import { findEventsForApplication, findExistingEvent } from "@/lib/google-calendar/events";
import { Header } from "@/components/shell/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/ui/badge";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { Divider } from "@/components/ui/divider";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApplicationDetailActions } from "@/components/applications/application-detail-actions";
import { ApplicationDocumentsTab } from "@/components/applications/application-documents-tab";
import { ApplicationLearningTab } from "@/components/applications/application-learning-tab";
import { ApplicationInterviewsTab } from "@/components/applications/application-interviews-tab";
import type { FollowUpItem } from "@/components/applications/application-follow-ups";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatDateTime, formatSalaryRange } from "@/lib/format";

/** Soonest still-upcoming interview or follow-up, for the "Next up" summary — a display convenience only. */
function computeNextUp(
  interviewAt: Date | null,
  followUps: FollowUpItem[],
): { label: string; whenIso: string; whenLabel: string } | null {
  const now = Date.now();
  const candidates: { label: string; whenIso: string; whenLabel: string }[] = [];

  if (interviewAt && interviewAt.getTime() > now) {
    candidates.push({ label: "Interview", whenIso: interviewAt.toISOString(), whenLabel: formatDateTime(interviewAt) });
  }
  for (const followUp of followUps) {
    if (followUp.start && new Date(followUp.start).getTime() > now) {
      candidates.push({ label: followUp.title, whenIso: followUp.start, whenLabel: formatDateTime(followUp.start) });
    }
  }

  candidates.sort((a, b) => a.whenIso.localeCompare(b.whenIso));
  return candidates[0] ?? null;
}

export default async function ApplicationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  const { id: idParam } = await params;

  let application;
  try {
    // idParam may be a raw ObjectId (old/bookmarked links) or a slug — either way
    // this resolves it to the real id scoped to the requesting user's applications.
    const id = await resolveApplicationId(userId, idParam);
    application = await getApplication(userId, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const label = `${application.jobTitle} at ${application.company.name}`;

  const calendarConnected = await isCalendarConnected(userId);
  let initialInterviewEvent: { id: string; title: string; start: string | null } | null = null;
  // A transient Calendar lookup failure shouldn't block the page from rendering —
  // both fall back to their empty state, and the UI lets the user try again.
  if (calendarConnected && application.interviewAt) {
    try {
      const existing = await findExistingEvent(userId, {
        eventType: "INTERVIEW",
        applicationId: application.id,
      });
      if (existing) initialInterviewEvent = { id: existing.id, title: existing.title, start: existing.start };
    } catch {
      // fall back to "not yet added"
    }
  }

  let initialFollowUps: FollowUpItem[] = [];
  if (calendarConnected) {
    try {
      const events = await findEventsForApplication(userId, application.id, "FOLLOW_UP");
      initialFollowUps = events.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        start: event.start,
        reminderMinutes: event.reminderMinutes,
      }));
    } catch {
      // fall back to an empty list
    }
  }

  // Writes via the API directly (not through the form) don't trim on save.
  const jobUrl = application.jobUrl?.trim() || null;
  const hasJobDescription = Boolean(application.jobDescription?.trim());

  const [applicationDocuments, applicationLearningPaths] = await Promise.all([
    listDocumentsForApplication(userId, application.id),
    listLearningPaths(userId, { applicationId: application.id }),
  ]);

  const resumeDocuments = applicationDocuments.filter((doc) => doc.type === "RESUME");
  const coverLetterDocuments = applicationDocuments.filter((doc) => doc.type === "COVER_LETTER");

  // Typically 0-1 paths per application, so fetching full detail for each is cheap.
  const learningPathsWithProgress = await Promise.all(
    applicationLearningPaths.map((path) => getLearningPathDetail(userId, path.id)),
  );

  const nextUp = computeNextUp(application.interviewAt, initialFollowUps);
  const defaultWorkspaceTab =
    application.interviewAt || initialFollowUps.length > 0 ? "interviews" : "documents";

  const facts = [
    { icon: MapPin, label: "Location", value: application.location ?? "Not specified" },
    {
      icon: Briefcase,
      label: "Employment type",
      value: application.employmentType ? EMPLOYMENT_TYPE_LABELS[application.employmentType] : "Not specified",
    },
    {
      icon: DollarSign,
      label: "Salary",
      value: formatSalaryRange(application.salaryMin, application.salaryMax),
    },
    { icon: Calendar, label: "Applied", value: formatDate(application.appliedAt) },
    ...(application.interviewAt
      ? [{ icon: Calendar, label: "Interview", value: formatDateTime(application.interviewAt) }]
      : []),
  ];

  return (
    <>
      <Header title="Application Details" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Applications
        </Link>

        <Card>
          <CardHeader className="flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
              <p className="text-sm text-muted-foreground">{application.company.name}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ApplicationStatusSelect applicationId={application.id} initialStatus={application.status} label={label} />
                {application.priority && <PriorityBadge priority={application.priority} />}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/ai-assistant?applicationId=${application.id}`}
                className={buttonVariants("outline", "sm")}
              >
                <Sparkles className="size-4" />
                Get AI Advice
              </Link>
              <ApplicationDetailActions applicationId={application.id} label={label} />
            </div>
          </CardHeader>
          <Divider />
          <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4 pt-5 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-start gap-2.5">
                <fact.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{fact.label}</p>
                  <p className="break-words text-sm font-medium text-foreground">{fact.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
          {jobUrl && (
            <CardContent className="pt-0">
              <a
                href={jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                View job posting
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            </CardContent>
          )}
        </Card>

        {nextUp && (
          <div className="flex items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
            <Clock className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-foreground">
              <span className="font-medium">Next up:</span> {nextUp.label} · {nextUp.whenLabel}
            </p>
          </div>
        )}

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
            <CardTitle>Job</CardTitle>
            {hasJobDescription && (
              <Link href={`/job-analysis?applicationId=${application.id}`} className={buttonVariants("outline", "sm")}>
                <FileSearch className="size-4" />
                Analyze Job
              </Link>
            )}
          </CardHeader>
          <Divider />
          <CardContent className="pt-5">
            {hasJobDescription ? (
              <p className="whitespace-pre-wrap text-sm text-foreground">{application.jobDescription}</p>
            ) : (
              <EmptyState
                icon={FileSearch}
                title="No job description added"
                description="Add the job description to unlock Job Analysis, Resume Analysis, and better AI suggestions for this application."
                action={
                  <Link href={`/applications/${application.id}/edit`} className={buttonVariants("outline", "sm")}>
                    Edit Application
                  </Link>
                }
                className="py-10"
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <Tabs defaultValue={defaultWorkspaceTab}>
              <TabsList className="flex-wrap">
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="learning">Learning Path</TabsTrigger>
                <TabsTrigger value="interviews">Interviews</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-6">
                <ApplicationDocumentsTab
                  applicationId={application.id}
                  hasJobDescription={hasJobDescription}
                  resumeDocuments={resumeDocuments}
                  coverLetterDocuments={coverLetterDocuments}
                />
              </TabsContent>

              <TabsContent value="learning" className="space-y-3">
                <ApplicationLearningTab
                  applicationId={application.id}
                  learningPathsWithProgress={learningPathsWithProgress}
                />
              </TabsContent>

              <TabsContent value="interviews" className="space-y-5">
                <ApplicationInterviewsTab
                  applicationId={application.id}
                  jobTitle={application.jobTitle}
                  companyName={application.company.name}
                  calendarConnected={calendarConnected}
                  interviewAt={application.interviewAt}
                  initialInterviewEvent={initialInterviewEvent}
                  initialFollowUps={initialFollowUps}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground">
          Added {formatDate(application.createdAt)} · Last updated {formatDate(application.updatedAt)}
        </p>
      </main>
    </>
  );
}
