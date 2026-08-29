import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail } from "lucide-react";
import { auth } from "@/auth";
import { getApplication, listApplications, NotFoundError } from "@/lib/applications/applications";
import { listDocuments } from "@/lib/documents/documents";
import { getCoverLetterForApplication } from "@/lib/cover-letter/cover-letter";
import { isValidObjectId } from "@/lib/object-id";
import { Header } from "@/components/shell/header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { CoverLetterPanel } from "@/components/cover-letter/cover-letter-panel";
import { CoverLetterStartPicker } from "@/components/cover-letter/cover-letter-start-picker";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The workspace's landing view (no applicationId in the URL): saved cover
 * letters to continue, plus a picker to start a new one.
 */
async function CoverLetterWorkspaceHome({ userId }: { userId: string }) {
  const [coverLetters, applications] = await Promise.all([
    listDocuments(userId, { type: "COVER_LETTER" }),
    listApplications(userId),
  ]);

  if (applications.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        title="Add an application to write a cover letter"
        description="Cover letters are grounded in a specific job — add an application first, then come back here to generate one for it."
        action={
          <Link href="/applications/new" className={buttonVariants("outline", "sm")}>
            Add an application
          </Link>
        }
        className="py-16"
      />
    );
  }

  const applicationOptions = applications.map((application) => ({
    id: application.id,
    jobTitle: application.jobTitle,
    companyName: application.company.name,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {coverLetters.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Your cover letters</h2>
          <div className="space-y-2">
            {coverLetters.map((coverLetter) => (
              <Link key={coverLetter.id} href={`/cover-letter?applicationId=${coverLetter.applicationId}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 py-4">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{coverLetter.title}</CardTitle>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Saved {formatDateTime(coverLetter.updatedAt)}
                      </p>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Start a new cover letter</CardTitle>
        </CardHeader>
        <CardContent>
          <CoverLetterStartPicker applications={applicationOptions} />
        </CardContent>
      </Card>
    </div>
  );
}

export default async function CoverLetterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  const resolvedSearchParams = await searchParams;
  const applicationIdParam = firstParam(resolvedSearchParams.applicationId);
  const applicationId = applicationIdParam && isValidObjectId(applicationIdParam) ? applicationIdParam : null;

  const application =
    applicationId === null
      ? null
      : await getApplication(userId, applicationId).catch((error) => {
          if (error instanceof NotFoundError) return null;
          throw error;
        });

  if (application === null) {
    return (
      <>
        <Header title="Cover Letters" />
        <main className="flex-1 p-4 md:p-6">
          <CoverLetterWorkspaceHome userId={userId} />
        </main>
      </>
    );
  }

  const [resumeDocuments, existingCoverLetter] = await Promise.all([
    listDocuments(userId, { type: "RESUME" }),
    getCoverLetterForApplication(userId, application.id),
  ]);

  const resumes = resumeDocuments.map((doc) => ({
    id: doc.id,
    title: doc.title,
    resumeRole: doc.resumeRole,
    isTailored: doc.sourceDocumentId != null,
  }));

  return (
    <>
      <Header title="Cover Letters" />
      <main className="flex-1 p-4 md:p-6">
        <CoverLetterPanel
          applicationId={application.id}
          jobTitle={application.jobTitle}
          companyName={application.company.name}
          hasJobDescription={Boolean(application.jobDescription?.trim())}
          resumes={resumes}
          initialCoverLetter={
            existingCoverLetter
              ? { content: existingCoverLetter.content, updatedAt: existingCoverLetter.updatedAt.toISOString() }
              : null
          }
        />
      </main>
    </>
  );
}
