import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDocument, NotFoundError } from "@/lib/documents/documents";
import { isValidObjectId } from "@/lib/object-id";
import { Header } from "@/components/shell/header";
import { DocumentForm } from "@/components/documents/document-form";

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const { id: idParam } = await params;
  if (!isValidObjectId(idParam)) {
    notFound();
  }
  const id = idParam;

  let document;
  try {
    document = await getDocument(session.user.id, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <Header title="Edit Document" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-3xl space-y-1 pb-4">
          <p className="text-sm text-muted-foreground">Editing {document.title}.</p>
        </div>
        <div className="mx-auto max-w-3xl">
          <DocumentForm
            mode="edit"
            documentId={document.id}
            initialValues={{
              title: document.title,
              type: document.type,
              contentFormat: document.contentFormat,
              resumeRole: document.resumeRole,
              content: document.content,
              isTailoredVersion: document.sourceDocumentId != null,
            }}
          />
        </div>
      </main>
    </>
  );
}
