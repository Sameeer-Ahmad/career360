import Link from "next/link";
import { FileText, Mail, TrendingUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { EmptyState } from "@/components/ui/empty-state";
import { DOCUMENT_TYPE_LABELS, formatDate } from "@/lib/format";
import type { listDocumentsForApplication } from "@/lib/documents/documents";

type ApplicationDocument = Awaited<ReturnType<typeof listDocumentsForApplication>>[number];

/** One row in the Documents tab — same compact "title + meta + Open" shape for both resumes and cover letters. */
function DocumentRow({ doc }: { doc: ApplicationDocument }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
        <p className="text-xs text-muted-foreground">
          {DOCUMENT_TYPE_LABELS[doc.type]}
          {doc.sourceDocumentId ? " · Tailored" : ""} · Updated {formatDate(doc.updatedAt)}
        </p>
      </div>
      <Link href={`/documents/${doc.id}`} className={buttonVariants("ghost", "sm")}>
        Open
      </Link>
    </div>
  );
}

export function ApplicationDocumentsTab({
  applicationId,
  hasJobDescription,
  resumeDocuments,
  coverLetterDocuments,
}: {
  applicationId: string;
  hasJobDescription: boolean;
  resumeDocuments: ApplicationDocument[];
  coverLetterDocuments: ApplicationDocument[];
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Resume</h3>
          {hasJobDescription && (
            <Link href={`/resume-analysis?applicationId=${applicationId}`} className={buttonVariants("outline", "sm")}>
              <TrendingUp className="size-4" />
              Analyze Resume
            </Link>
          )}
        </div>
        {resumeDocuments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No resume tailored yet"
            description="Tailor a resume for this application to see it here."
            action={
              <Link href="/documents" className={buttonVariants("outline", "sm")}>
                Browse Documents
              </Link>
            }
            className="py-10"
          />
        ) : (
          <div className="space-y-2">
            {resumeDocuments.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>

      <Divider />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Cover Letter</h3>
          <Link href={`/cover-letter?applicationId=${applicationId}`} className={buttonVariants("outline", "sm")}>
            <Mail className="size-4" />
            {coverLetterDocuments.length > 0 ? "Continue" : "Generate Cover Letter"}
          </Link>
        </div>
        {coverLetterDocuments.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No cover letter yet"
            description="Generate a cover letter grounded in your resume and this job's description."
            className="py-10"
          />
        ) : (
          <div className="space-y-2">
            {coverLetterDocuments.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
