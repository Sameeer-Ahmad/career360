import Link from "next/link";
import type { Document } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DocumentRowActions } from "@/components/documents/document-row-actions";
import { DOCUMENT_TYPE_LABELS, formatDate } from "@/lib/format";

export function DocumentCard({ document }: { document: Document }) {
  // Same reasoning as DocumentRowActions — a cover letter opens into the
  // Cover Letter workspace (its actual home, with the application context
  // and the resume/regenerate/save flow), not the generic document viewer.
  const titleHref =
    document.type === "COVER_LETTER" && document.applicationId
      ? `/cover-letter?applicationId=${document.applicationId}`
      : `/documents/${document.id}`;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={titleHref} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{document.title}</p>
        </Link>
        <DocumentRowActions
          documentId={document.id}
          label={document.title}
          type={document.type}
          applicationId={document.applicationId}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant={document.type === "RESUME" ? "primary" : "neutral"}>
          {DOCUMENT_TYPE_LABELS[document.type]}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Updated {formatDate(document.updatedAt)}</span>
      </div>
    </Card>
  );
}
