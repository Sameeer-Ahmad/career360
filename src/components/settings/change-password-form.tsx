"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";

export function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const canSubmit = currentPassword !== "" && newPassword !== "" && confirmNewPassword !== "" && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setIssues([]);
    try {
      const response = await fetch("/api/account/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message = body?.issues ?? [body?.error ?? "Could not change your password. Please try again."];
        setIssues(message);
        toast.error(body?.error ?? "Could not change your password. Please try again.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast.success("Password changed");
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          minLength={8}
          placeholder="At least 8 characters"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-new-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-new-password"
          autoComplete="new-password"
          value={confirmNewPassword}
          onChange={(event) => setConfirmNewPassword(event.target.value)}
        />
      </div>

      {issues.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-status-rejected-fg">
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}

      <Button type="button" onClick={handleSubmit} disabled={!canSubmit}>
        {saving ? "Changing password…" : "Change password"}
      </Button>
    </div>
  );
}
