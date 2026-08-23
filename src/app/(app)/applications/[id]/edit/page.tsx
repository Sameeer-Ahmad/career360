import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getApplication, NotFoundError } from "@/lib/applications";
import { Header } from "@/components/shell/header";
import { ApplicationForm } from "@/components/applications/application-form";

export default async function EditApplicationPage({
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

  return (
    <>
      <Header title="Edit Application" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-1 pb-4">
          <p className="text-sm text-muted-foreground">
            Editing {application.jobTitle} at {application.company.name}.
          </p>
        </div>
        <div className="mx-auto max-w-3xl">
          <ApplicationForm
            mode="edit"
            applicationId={application.id}
            initialValues={{
              companyName: application.company.name,
              jobTitle: application.jobTitle,
              jobUrl: application.jobUrl,
              location: application.location,
              salaryMin: application.salaryMin,
              salaryMax: application.salaryMax,
              employmentType: application.employmentType,
              appliedAt: application.appliedAt,
              status: application.status,
              priority: application.priority,
              jobDescription: application.jobDescription,
            }}
          />
        </div>
      </main>
    </>
  );
}
