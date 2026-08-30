import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications/applications";
import { isValidObjectId } from "@/lib/object-id";
import { Header } from "@/components/shell/header";
import { JobAnalysisPanel, type JobAnalysisApplicationContext } from "@/components/job-analysis/job-analysis-panel";

export default async function JobAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const rawApplicationId = resolvedSearchParams.applicationId;
  const applicationIdParam = Array.isArray(rawApplicationId) ? rawApplicationId[0] : rawApplicationId;
  const applicationId = applicationIdParam && isValidObjectId(applicationIdParam) ? applicationIdParam : null;

  let applicationContext: JobAnalysisApplicationContext | undefined;
  if (applicationId !== null) {
    try {
      // Re-checked here too (not just the API route) so job description context is only ever shown to its owner.
      const application = await getApplication(session.user.id, applicationId);
      if (application.jobDescription?.trim()) {
        applicationContext = {
          id: application.id,
          jobTitle: application.jobTitle,
          companyName: application.company.name,
          jobDescription: application.jobDescription,
        };
      }
      // No job description on this application — fall back to standalone mode below.
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      // Invalid or not-owned application id — fall back to standalone mode.
    }
  }

  return (
    <>
      <Header title="Job Analysis" />
      <main className="flex-1 p-4 md:p-6">
        <JobAnalysisPanel applicationContext={applicationContext} />
      </main>
    </>
  );
}
