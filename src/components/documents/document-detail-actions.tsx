"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";

export function DocumentDetailActions({
  documentId,
  label,
  versionCount = 0,
}: {
  documentId: string;
  label: string;
  versionCount?: number;
}) {
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link href={`/documents/${documentId}/edit`} className={buttonVariants("outline", "sm")}>
        <Pencil className="size-4" />
        Edit
      </Link>
      <DeleteDocumentDialog
        documentId={documentId}
        label={label}
        versionCount={versionCount}
        onDeleted={() => {
          router.push("/documents");
          router.refresh();
        }}
        trigger={
          <Button variant="destructive" size="sm">
            <Trash2 className="size-4" />
            Delete
          </Button>
        }
      />
    </div>
  );
}
