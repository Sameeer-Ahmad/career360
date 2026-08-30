"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { IconButton, iconButtonVariants } from "@/components/ui/icon-button";
import { DeleteApplicationDialog } from "@/components/applications/delete-application-dialog";

export function ApplicationRowActions({
  applicationId,
  href,
  label,
}: {
  applicationId: string;
  /** Application detail destination; defaults to the raw id route if omitted. */
  href?: string;
  label: string;
}) {
  const router = useRouter();
  const detailHref = href ?? `/applications/${applicationId}`;

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={detailHref} aria-label={`View ${label}`} className={iconButtonVariants("ghost", "sm")}>
        <Eye />
      </Link>
      <Link
        href={`/applications/${applicationId}/edit`}
        aria-label={`Edit ${label}`}
        className={iconButtonVariants("ghost", "sm")}
      >
        <Pencil />
      </Link>
      <DeleteApplicationDialog
        applicationId={applicationId}
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
