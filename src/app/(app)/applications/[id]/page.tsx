import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Briefcase, Calendar, DollarSign, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications";
import { Header } from "@/components/shell/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";
import { buttonVariants } from "@/components/ui/button";
import { ApplicationDetailActions } from "@/components/applications/application-detail-actions";
import { EMPLOYMENT_TYPE_LABELS, formatDate, formatSalaryRange } from "@/lib/format";

export default async function ApplicationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let application;
  try {
    application = await getApplication(Number(session.user.id), id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const label = `${application.jobTitle} at ${application.company.name}`;

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
                <StatusBadge status={application.status} />
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
          <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-start gap-2.5">
                <fact.icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{fact.label}</p>
                  <p className="truncate text-sm font-medium text-foreground">{fact.value}</p>
                </div>
              </div>
            ))}
          </CardContent>
          {application.jobUrl && (
            <CardContent className="pt-0">
              <a
                href={application.jobUrl}
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

        {application.jobDescription && (
          <Card>
            <CardHeader>
              <CardTitle>Job description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-foreground">{application.jobDescription}</p>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          Added {formatDate(application.createdAt)} · Last updated {formatDate(application.updatedAt)}
        </p>
      </main>
    </>
  );
}
