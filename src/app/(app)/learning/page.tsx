import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications/applications";
import { isValidObjectId } from "@/lib/object-id";
import { isCalendarConnected } from "@/lib/google-calendar/connection";
import { Header } from "@/components/shell/header";
import { LearningWorkspace, type LearningApplicationContext } from "@/components/learning/learning-workspace";

export default async function LearningPage({
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
  const applicationId =
    applicationIdParam && isValidObjectId(applicationIdParam) ? applicationIdParam : null;

  let applicationContext: LearningApplicationContext | undefined;
  if (applicationId !== null) {
    try {
      // Re-verifies ownership here too so we only show context for applications this user owns.
      const application = await getApplication(session.user.id, applicationId);
      applicationContext = {
        id: application.id,
        jobTitle: application.jobTitle,
        companyName: application.company.name,
        hasJobDescription: Boolean(application.jobDescription?.trim()),
      };
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      // Invalid or not-owned application id — fall back to general mode.
    }
  }

  const calendarConnected = await isCalendarConnected(session.user.id);

  return (
    <>
      <Header title="Learning" />
      <main className="flex-1 p-4 md:p-6">
        <LearningWorkspace applicationContext={applicationContext} calendarConnected={calendarConnected} />
      </main>
    </>
  );
}
