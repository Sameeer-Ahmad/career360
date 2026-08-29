import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApplication, listApplications, NotFoundError } from "@/lib/applications/applications";
import { listDocuments } from "@/lib/documents/documents";
import { isValidObjectId } from "@/lib/object-id";
import { Header } from "@/components/shell/header";
import {
  ResumeAnalysisPanel,
  type ResumeAnalysisApplicationContext,
} from "@/components/resume/resume-analysis-panel";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ResumeAnalysisPage({
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

  const documentIdParam = firstParam(resolvedSearchParams.documentId);
  const initialDocumentId = documentIdParam && isValidObjectId(documentIdParam) ? documentIdParam : undefined;

  const applicationIdParam = firstParam(resolvedSearchParams.applicationId);
  const applicationId = applicationIdParam && isValidObjectId(applicationIdParam) ? applicationIdParam : null;

  const [resumeDocuments, allApplications, applicationContext] = await Promise.all([
    listDocuments(userId, { type: "RESUME" }),
    listApplications(userId),
    (async (): Promise<ResumeAnalysisApplicationContext | undefined> => {
      if (applicationId === null) return undefined;
      try {
        // Re-verifies ownership here too (in addition to the API route) so we only
        // ever show application context — including its job description — for
        // applications this user actually owns.
        const application = await getApplication(userId, applicationId);
        if (!application.jobDescription?.trim()) return undefined;
        return {
          id: application.id,
          jobTitle: application.jobTitle,
          companyName: application.company.name,
          jobDescription: application.jobDescription,
        };
      } catch (error) {
        if (!(error instanceof NotFoundError)) throw error;
        // Invalid or not-owned application id — fall back to standalone mode.
        return undefined;
      }
    })(),
  ]);

  const resumes = resumeDocuments.map((doc) => ({
    id: doc.id,
    title: doc.title,
    resumeRole: doc.resumeRole,
    isTailored: doc.sourceDocumentId != null,
  }));
  const masterOptions = resumeDocuments
    .filter((doc) => doc.sourceDocumentId == null && doc.resumeRole === "MASTER")
    .map((doc) => ({ id: doc.id, title: doc.title }));
  const applicationOptions = allApplications
    .filter((app) => app.jobDescription?.trim())
    .map((app) => ({ id: app.id, jobTitle: app.jobTitle, companyName: app.company.name }));

  return (
    <>
      <Header title="Resume Analysis" />
      <main className="flex-1 p-4 md:p-6">
        <ResumeAnalysisPanel
          resumes={resumes}
          masterOptions={masterOptions}
          applicationOptions={applicationOptions}
          initialDocumentId={initialDocumentId}
          applicationContext={applicationContext}
        />
      </main>
    </>
  );
}
