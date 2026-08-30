import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog } from "@/components/ui/dialog";
import { MAX_TITLE_LENGTH } from "@/lib/documents/document-limits";

// Mounted only while open, so `title` resets fresh from defaultTitle each time — no effect needed.
function SaveVersionDialogFields({
  defaultTitle,
  saving,
  error,
  onClose,
  onSave,
}: {
  defaultTitle: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState(defaultTitle);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="tailoredTitle">Title</Label>
        <Input
          id="tailoredTitle"
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-status-rejected-fg">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={saving || !title.trim()} onClick={() => onSave(title.trim())}>
          {saving ? "Saving…" : "Save Version"}
        </Button>
      </div>
    </div>
  );
}

export function SaveVersionDialog({
  open,
  defaultTitle,
  saving,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  defaultTitle: string;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      title="Save tailored version"
      description="This creates a new, independent resume document. Your base resume and Master Resume are never modified."
    >
      {open && (
        <SaveVersionDialogFields
          defaultTitle={defaultTitle}
          saving={saving}
          error={error}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </Dialog>
  );
}
