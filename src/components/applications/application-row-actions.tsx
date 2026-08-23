"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { IconButton, iconButtonVariants } from "@/components/ui/icon-button";
import { DeleteApplicationDialog } from "@/components/applications/delete-application-dialog";

export function ApplicationRowActions({
  applicationId,
  label,
}: {
  applicationId: number;
  label: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/applications/${applicationId}`} aria-label={`View ${label}`} className={iconButtonVariants("ghost", "sm")}>
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
