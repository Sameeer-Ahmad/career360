import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileSearch, Info } from "lucide-react";
import { auth } from "@/auth";
import { getDocumentDetail, listResumeVersions, NotFoundError } from "@/lib/documents/documents";
import { isValidObjectId } from "@/lib/object-id";
import { Header } from "@/components/shell/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Divider } from "@/components/ui/divider";
import { buttonVariants } from "@/components/ui/button";
import { DocumentDetailActions } from "@/components/documents/document-detail-actions";
import { DOCUMENT_TYPE_LABELS, formatDate, RESUME_ROLE_LABELS } from "@/lib/format";
import { approximateLatexPreview } from "@/lib/documents/latex-preview";

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  const { id: idParam } = await params;
  if (!isValidObjectId(idParam)) {
    notFound();
  }
  const id = idParam;

  let document;
  try {
    document = await getDocumentDetail(userId, id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  const versions =
    document.type === "RESUME" && document._count.versions > 0
      ? await listResumeVersions(userId, document.id)
      : [];

  const latexPreview =
    document.contentFormat === "LATEX" ? approximateLatexPreview(document.content) : null;

  return (
    <>
      <Header title="Document Details" />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        <Link
          href="/documents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to Documents
        </Link>

        <Card>
          <CardHeader className="flex-col items-start justify-between gap-4 sm:flex-row">
            <div>
              <CardTitle className="text-lg">{document.title}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={document.type === "RESUME" ? "primary" : "neutral"}>
                  {DOCUMENT_TYPE_LABELS[document.type]}
                </Badge>
                {document.type === "RESUME" &&
                  (document.sourceDocument ? (
                    <Badge variant="info">Tailored version</Badge>
                  ) : document.resumeRole ? (
                    <Badge variant={document.resumeRole === "MAIN" ? "primary" : "info"}>
                      {RESUME_ROLE_LABELS[document.resumeRole]}
                    </Badge>
                  ) : null)}
                {document.contentFormat === "LATEX" && <Badge variant="neutral">LaTeX source</Badge>}
              </div>
              {document.sourceDocument && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tailored from{" "}
                  <Link href={`/documents/${document.sourceDocument.id}`} className="text-primary hover:underline">
                    {document.sourceDocument.title}
                  </Link>
                  {document.masterDocument && (
                    <>
                      {" "}
                      using content from{" "}
                      <Link href={`/documents/${document.masterDocument.id}`} className="text-primary hover:underline">
                        {document.masterDocument.title}
                      </Link>
                    </>
                  )}
                  {document.application && (
                    <>
                      {" "}
                      for{" "}
                      <Link href={`/applications/${document.application.id}`} className="text-primary hover:underline">
                        {document.application.jobTitle} at {document.application.company.name}
                      </Link>
                    </>
                  )}
                  . Neither source is modified by tailoring.
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {document.type === "RESUME" && (
                <Link
                  href={`/resume-analysis?documentId=${document.id}`}
                  className={buttonVariants("outline", "sm")}
                >
                  <FileSearch className="size-4" />
                  Analyze Resume
                </Link>
              )}
              <DocumentDetailActions
                documentId={document.id}
                label={document.title}
                versionCount={document._count.versions}
              />
            </div>
          </CardHeader>
          <Divider />
          <CardContent className="pt-5">
            <p className="text-xs text-muted-foreground">
              Added {formatDate(document.createdAt)} · Last updated {formatDate(document.updatedAt)}
            </p>
          </CardContent>
        </Card>

        {versions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tailored versions ({versions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{version.title}</p>
                    {version.application && (
                      <p className="truncate text-xs text-muted-foreground">
                        {version.application.jobTitle} at {version.application.company.name}
                      </p>
                    )}
                  </div>
                  <Link href={`/documents/${version.id}`} className={buttonVariants("ghost", "sm")}>
                    Open
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap font-mono text-xs text-foreground">{document.content}</p>
          </CardContent>
        </Card>

        {latexPreview !== null && (
          <Card>
            <CardHeader>
              <CardTitle>Plain-text approximation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span>
                  This strips common LaTeX commands so the text is readable — it is not a compiled
                  preview and won&apos;t reflect the actual PDF layout. Full LaTeX compilation isn&apos;t
                  available yet.
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">{latexPreview || "—"}</p>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
