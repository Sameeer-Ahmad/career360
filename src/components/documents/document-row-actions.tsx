"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DocumentType } from "@prisma/client";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { IconButton, iconButtonVariants } from "@/components/ui/icon-button";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";

export function DocumentRowActions({
  documentId,
  label,
  type,
  applicationId,
}: {
  documentId: string;
  label: string;
  /** When given as "COVER_LETTER" with a non-null applicationId, View/Edit both route into the Cover Letter workspace (source resume, regenerate, save) instead of the generic document viewer, which has none of that and no link back to the application. */
  type?: DocumentType;
  applicationId?: string | null;
}) {
  const router = useRouter();
  const coverLetterHref =
    type === "COVER_LETTER" && applicationId ? `/cover-letter?applicationId=${applicationId}` : null;

  return (
    <div className="flex items-center justify-end gap-1">
      {coverLetterHref ? (
        <Link
          href={coverLetterHref}
          aria-label={`Open ${label} in Cover Letter`}
          className={iconButtonVariants("ghost", "sm")}
        >
          <Eye />
        </Link>
      ) : (
        <>
          <Link
            href={`/documents/${documentId}`}
            aria-label={`View ${label}`}
            className={iconButtonVariants("ghost", "sm")}
          >
            <Eye />
          </Link>
          <Link
            href={`/documents/${documentId}/edit`}
            aria-label={`Edit ${label}`}
            className={iconButtonVariants("ghost", "sm")}
          >
            <Pencil />
          </Link>
        </>
      )}
      <DeleteDocumentDialog
        documentId={documentId}
        label={label}
        onDeleted={() => router.refresh()}
        trigger={
          <IconButton aria-label={`Delete ${label}`} size="sm">
            <Trash2 />
          </IconButton>
        }
      />
    </div>
  );
}
