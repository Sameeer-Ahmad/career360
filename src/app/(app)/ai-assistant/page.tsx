import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications/applications";
import { isValidObjectId } from "@/lib/object-id";
import { Header } from "@/components/shell/header";
import { CareerAssistant, type AssistantApplicationContext } from "@/components/ai-assistant/career-assistant";

export default async function AIAssistantPage({
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

  let applicationContext: AssistantApplicationContext | undefined;
  if (applicationId !== null) {
    try {
      // Re-verifies ownership here too (in addition to the API route) purely so we
      // only show the context chip for applications this user actually owns.
      const application = await getApplication(session.user.id, applicationId);
      applicationContext = {
        id: application.id,
        jobTitle: application.jobTitle,
        companyName: application.company.name,
      };
    } catch (error) {
      if (!(error instanceof NotFoundError)) throw error;
      // Invalid or not-owned application id — fall back to the assistant with no context.
    }
  }

  return (
    <>
      <Header title="AI Assistant" />
      <main className="flex-1 p-4 md:p-6">
        <CareerAssistant applicationContext={applicationContext} />
      </main>
    </>
  );
}
