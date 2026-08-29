"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DeleteDocumentDialog({
  documentId,
  label,
  versionCount = 0,
  trigger,
  onDeleted,
}: {
  documentId: string;
  /** e.g. "Software Engineer Resume" — shown in the confirmation copy. */
  label: string;
  /** Tailored versions derived from this document, if any — deleting it cascades to these. */
  versionCount?: number;
  trigger: React.ReactNode;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const body = await response.json().catch(() => null);
        const message = body?.error ?? "Could not delete this document. Please try again.";
        setError(message);
        toast.error(message);
        setDeleting(false);
        return;
      }
      setOpen(false);
      setDeleting(false);
      toast.success("Document deleted");
      onDeleted();
    } catch {
      setError("Network error — please check your connection and try again.");
      toast.error("Network error — please check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>
      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Delete document?"
        description={
          versionCount > 0
            ? `This will permanently delete "${label}" AND its ${versionCount} tailored ${versionCount === 1 ? "version" : "versions"}. This action cannot be undone.`
            : `This will permanently delete "${label}". This action cannot be undone.`
        }
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
