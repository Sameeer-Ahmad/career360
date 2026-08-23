"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { buttonVariants, Button } from "@/components/ui/button";
import { DeleteApplicationDialog } from "@/components/applications/delete-application-dialog";

export function ApplicationDetailActions({
  applicationId,
  label,
}: {
  applicationId: number;
  label: string;
}) {
  const router = useRouter();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link href={`/applications/${applicationId}/edit`} className={buttonVariants("outline", "sm")}>
        <Pencil className="size-4" />
        Edit
      </Link>
      <DeleteApplicationDialog
        applicationId={applicationId}
        label={label}
        onDeleted={() => {
          router.push("/applications");
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
