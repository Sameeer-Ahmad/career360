import { Header } from "@/components/shell/header";
import { DocumentForm } from "@/components/documents/document-form";

export default function NewDocumentPage() {
  return (
    <>
      <Header title="Add Document" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-1 pb-4">
          <p className="text-sm text-muted-foreground">
            Add a resume, cover letter, or other document. Resumes can be analyzed against a job
            description once added.
          </p>
        </div>
        <div className="mx-auto max-w-3xl">
          <DocumentForm mode="create" />
        </div>
      </main>
    </>
  );
}
