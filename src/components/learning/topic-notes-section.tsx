"use client";

import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSaveSequencer } from "@/lib/save-sequence";

const NOTE_DEBOUNCE_MS = 1800;
type NoteSaveState = "idle" | "saving" | "saved" | "error";

export function TopicNotesSection({ topicId }: { topicId: string }) {
  // A fresh TopicNotesSection instance exists per topic (each topic row
  // owns its own subtree), so this only ever fetches once per mount —
  // "loading" starts true rather than being set synchronously in the
  // effect below, matching this file's established effect pattern.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [content, setContent] = useState("");
  const [saveState, setSaveState] = useState<NoteSaveState>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequencerRef = useRef(createSaveSequencer());
  const lastSavedRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/learning/topics/${topicId}/notes`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "Could not load notes. Please try again.");
        return body;
      })
      .then((body) => {
        if (cancelled) return;
        const noteContent = body?.note?.content ?? "";
        setContent(noteContent);
        lastSavedRef.current = noteContent;
        setLoaded(true);
      })
      .catch((error: Error) => {
        if (!cancelled) setLoadError(error.message || "Network error — please check your connection and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [topicId]);

  async function persist(value: string) {
    const sequence = sequencerRef.current.next();
    setSaveState("saving");
    try {
      const response = await fetch(`/api/learning/topics/${topicId}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: value }),
      });
      // A newer save has already been dispatched since this one started —
      // its response (whenever it arrives) is the only one allowed to win.
      if (!sequencerRef.current.isLatest(sequence)) return;
      if (!response.ok) {
        setSaveState("error");
        return;
      }
      lastSavedRef.current = value;
      setSaveState("saved");
    } catch {
      if (sequencerRef.current.isLatest(sequence)) setSaveState("error");
    }
  }

  function handleChange(value: string) {
    setContent(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(value), NOTE_DEBOUNCE_MS);
  }

  function handleBlur() {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (content !== lastSavedRef.current) {
      persist(content);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading notes…</p>;
  if (loadError) return <p className="text-sm text-status-rejected-fg">{loadError}</p>;
  if (!loaded) return null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={`notes-${topicId}`} className="sr-only">
        My Notes
      </Label>
      <Textarea
        id={`notes-${topicId}`}
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="Click to add notes..."
        rows={4}
      />
      <div className="min-h-[1rem] text-xs">
        {saveState === "saving" && <p className="text-muted-foreground">Saving…</p>}
        {saveState === "saved" && <p className="text-muted-foreground">Saved</p>}
        {saveState === "error" && (
          <p role="alert" className="text-status-rejected-fg">
            Couldn&apos;t save —{" "}
            <button type="button" className="underline" onClick={() => persist(content)}>
              retry
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
