"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { DocumentContentFormat } from "@prisma/client";
import { AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_FILE_SIZE_BYTES } from "@/lib/documents/document-limits";

export function ResumeUpload({
  onExtracted,
}: {
  onExtracted: (content: string, filename: string, contentFormat: DocumentContentFormat) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file again later
    if (!file) return;

    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      setError(
        `File is too large. Please upload a file under ${Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB.`,
      );
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/documents/extract", { method: "POST", body: formData });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        setError(body?.error ?? "Could not read this file. Please try again.");
        return;
      }

      onExtracted(body.content as string, file.name, body.contentFormat as DocumentContentFormat);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.tex"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
        <Upload className="size-4" />
        {uploading ? "Reading file…" : "Upload PDF, DOCX, or .tex"}
      </Button>
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm text-status-rejected-fg">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
