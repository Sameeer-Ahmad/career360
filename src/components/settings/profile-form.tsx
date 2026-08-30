"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export function ProfileForm({
  name: initialName,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [imageFailed, setImageFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const initial = (initialName || email || "?").charAt(0).toUpperCase();
  const dirty = name.trim() !== initialName && name.trim().length > 0;

  async function handleSave() {
    if (saving || !dirty) return;
    setSaving(true);
    setIssues([]);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setIssues(body?.issues ?? [body?.error ?? "Could not save your profile. Please try again."]);
        toast.error(body?.error ?? "Could not save your profile. Please try again.");
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {avatarUrl && !imageFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-medium text-primary">
            {initial}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {avatarUrl ? "Synced from your Google account." : "No profile picture on file."}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="settings-name">Name</Label>
        <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="settings-email">Email</Label>
        <Input id="settings-email" value={email} disabled />
      </div>

      {issues.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-status-rejected-fg">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <Button type="button" onClick={handleSave} disabled={!dirty || saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}
