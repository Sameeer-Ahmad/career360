import { Header } from "@/components/shell/header";
import { ApplicationForm } from "@/components/applications/application-form";

export default function NewApplicationPage() {
  return (
    <>
      <Header title="Add Application" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-1 pb-4">
          <p className="text-sm text-muted-foreground">
            Add a role you&apos;re tracking. Only company and job title are required.
          </p>
        </div>
        <div className="mx-auto max-w-3xl">
          <ApplicationForm mode="create" />
        </div>
      </main>
    </>
  );
}
