import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications";
import { Header } from "@/components/shell/header";
import { JobAnalysisPanel, type JobAnalysisApplicationContext } from "@/components/ai/job-analysis-panel";

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
  const applicationId = applicationIdParam ? Number(applicationIdParam) : NaN;

  let applicationContext: JobAnalysisApplicationContext | undefined;
  if (Number.isInteger(applicationId) && applicationId > 0) {
    try {
      // Re-verifies ownership here too (in addition to the API route) so we only
      // ever show application context — including its job description — for
      // applications this user actually owns.
      const application = await getApplication(Number(session.user.id), applicationId);
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
