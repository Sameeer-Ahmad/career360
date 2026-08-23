"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteApplicationDialog({
  applicationId,
  label,
  trigger,
  onDeleted,
}: {
  applicationId: number;
  /** e.g. "Senior Frontend Engineer at Acme Corp" — shown in the confirmation copy. */
  label: string;
  trigger: React.ReactNode;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not delete this application. Please try again.");
        setDeleting(false);
        return;
      }
      setOpen(false);
      setDeleting(false);
      onDeleted();
    } catch {
      setError("Network error — please check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Delete application?"
        description={`This will permanently delete "${label}". This action cannot be undone.`}
      >
        {error && (
          <p role="alert" className="mb-3 text-sm text-status-rejected-fg">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={deleting} onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
            <Trash2 className="size-4" />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
