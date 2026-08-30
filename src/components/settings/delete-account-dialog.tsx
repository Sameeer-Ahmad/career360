"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Could not delete your account. Please try again.");
        setDeleting(false);
        return;
      }
      router.push("/login");
    } catch {
      setError("Network error — please check your connection and try again.");
      setDeleting(false);
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-4" />
        Delete account
      </Button>
      <Dialog
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Delete your account?"
        description="This will permanently delete your account, applications, documents, cover letters, and learning paths. This action cannot be undone."
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
            {deleting ? "Deleting…" : "Delete account"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
