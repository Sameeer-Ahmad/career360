import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import type {
  PathNoteRow,
  PersonalTopicForm,
  Resource,
  ResourceFormState,
  ResourcesByTopic,
  SavedPathDetail,
  SavedTopic,
  TopicProgressData,
  WorkspaceTab,
} from "@/components/learning/learning-types";

export function usePathWorkspace({ pathId, onBack, onDeleted }: { pathId: string; onBack: () => void; onDeleted: () => void }) {
  const toast = useToast();
  const [detail, setDetail] = useState<SavedPathDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [resourcesByTopic, setResourcesByTopic] = useState<ResourcesByTopic | null>(null);
  const [resourcesLoading, setResourcesLoading] = useState(true);
  const [resourcesError, setResourcesError] = useState<string | null>(null);

  const [notes, setNotes] = useState<PathNoteRow[] | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [openTopicIds, setOpenTopicIds] = useState<Record<string, boolean>>({});

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function loadDetail() {
    fetch(`/api/learning/${pathId}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "Could not load this learning path. Please try again.");
        return body as SavedPathDetail;
      })
      .then((data) => {
        setDetail(data);
        setDetailError(null);
      })
      .catch((error: Error) => setDetailError(error.message))
      .finally(() => setLoadingDetail(false));
  }

  function loadResources() {
    fetch(`/api/learning/${pathId}/resources`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "Could not load resources. Please try again.");
        return body as { topics: { topicId: string; fetchedAt: string | null; stale: boolean; resources: Resource[] }[] };
      })
      .then((body) => {
        const map: ResourcesByTopic = {};
        for (const t of body.topics) {
          map[t.topicId] = { resources: t.resources, fetchedAt: t.fetchedAt, stale: t.stale };
        }
        setResourcesByTopic(map);
        setResourcesError(null);
      })
      .catch((error: Error) => setResourcesError(error.message))
      .finally(() => setResourcesLoading(false));
  }

  function loadNotes() {
    if (notes !== null || notesLoading) return;
    setNotesLoading(true);
    fetch(`/api/learning/${pathId}/notes`)
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error ?? "Could not load notes. Please try again.");
        return body as { notes: PathNoteRow[] };
      })
      .then((body) => {
        setNotes(body.notes);
        setNotesError(null);
      })
      .catch((error: Error) => setNotesError(error.message))
      .finally(() => setNotesLoading(false));
  }

  // A fresh PathWorkspace instance is mounted per selected path (the list
  // view unmounts it when going back), so this only ever runs once per
  // mount — no synchronous setState needed here beyond the plain state
  // resets below, matching this file's established effect pattern.
  useEffect(() => {
    loadDetail();
    loadResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-runs only when the selected path changes
  }, [pathId]);

  function handleTabChange(value: string) {
    setTab(value as WorkspaceTab);
    if (value === "notes") loadNotes();
  }

  function openTopic(topicId: string) {
    setTab("topics");
    if (topicId) setOpenTopicIds((prev) => ({ ...prev, [topicId]: true }));
  }

  function handleProgressChange(topicId: string, progress: TopicProgressData) {
    setDetail((prev) => {
      if (!prev) return prev;
      const topics = prev.topics.map((t) => (t.id === topicId ? { ...t, progress } : t));
      const total = topics.length;
      const completed = topics.filter((t) => t.progress?.status === "COMPLETED").length;
      const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
      return { ...prev, topics, progressSummary: { completed, total, percentage } };
    });
  }

  async function handleAddTopic(form: PersonalTopicForm): Promise<string | null> {
    try {
      const response = await fetch(`/api/learning/${pathId}/topics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: form.topic,
          reason: form.reason || null,
          priority: form.priority,
          currentLevel: form.currentLevel,
          recommendedLevel: form.recommendedLevel,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return body?.error ?? "Could not add this topic. Please try again.";

      const newTopic: SavedTopic = { ...(body as SavedTopic), progress: null };
      setDetail((prev) => {
        if (!prev) return prev;
        const topics = [...prev.topics, newTopic];
        const total = topics.length;
        const completed = topics.filter((t) => t.progress?.status === "COMPLETED").length;
        return {
          ...prev,
          topics,
          progressSummary: { completed, total, percentage: total === 0 ? 0 : Math.round((completed / total) * 100) },
        };
      });
      setResourcesByTopic((prev) => ({ ...(prev ?? {}), [newTopic.id]: { resources: [], fetchedAt: null, stale: false } }));
      return null;
    } catch {
      return "Network error — please check your connection and try again.";
    }
  }

  const resourceHandlers = {
    async refresh(topicId: string): Promise<string | null> {
      try {
        const response = await fetch(`/api/learning/topics/${topicId}/resources/refresh`, { method: "POST" });
        const body = await response.json().catch(() => null);
        if (!response.ok) return body?.error ?? "Could not refresh resources. Please try again.";
        setResourcesByTopic((prev) => ({
          ...(prev ?? {}),
          [topicId]: { resources: body.resources, fetchedAt: body.fetchedAt, stale: body.stale, warning: body.warning },
        }));
        return null;
      } catch {
        return "Network error — please check your connection and try again.";
      }
    },
    async add(topicId: string, form: ResourceFormState): Promise<string | null> {
      try {
        const response = await fetch(`/api/learning/topics/${topicId}/resources`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, url: form.url, type: form.type, description: form.description || null }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) return body?.error ?? "Could not add this resource. Please try again.";
        setResourcesByTopic((prev) => {
          const current = prev?.[topicId] ?? { resources: [], fetchedAt: null, stale: false };
          return { ...(prev ?? {}), [topicId]: { ...current, resources: [...current.resources, body as Resource] } };
        });
        return null;
      } catch {
        return "Network error — please check your connection and try again.";
      }
    },
    async edit(topicId: string, resourceId: string, form: ResourceFormState): Promise<string | null> {
      try {
        const response = await fetch(`/api/learning/topics/${topicId}/resources/${resourceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, url: form.url, type: form.type, description: form.description || null }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) return body?.error ?? "Could not save changes. Please try again.";
        setResourcesByTopic((prev) => {
          const current = prev?.[topicId];
          if (!current) return prev;
          return {
            ...(prev ?? {}),
            [topicId]: { ...current, resources: current.resources.map((r) => (r.id === resourceId ? (body as Resource) : r)) },
          };
        });
        return null;
      } catch {
        return "Network error — please check your connection and try again.";
      }
    },
    async delete(topicId: string, resourceId: string) {
      const response = await fetch(`/api/learning/topics/${topicId}/resources/${resourceId}`, { method: "DELETE" });
      if (response.ok || response.status === 404) {
        setResourcesByTopic((prev) => {
          const current = prev?.[topicId];
          if (!current) return prev;
          return { ...(prev ?? {}), [topicId]: { ...current, resources: current.resources.filter((r) => r.id !== resourceId) } };
        });
      }
    },
  };

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/learning/${pathId}`, { method: "DELETE" });
      if (response.ok || response.status === 404) {
        setConfirmDeleteOpen(false);
        toast.success("Learning path deleted");
        onDeleted();
        onBack();
      } else {
        toast.error("Could not delete this learning path. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  return {
    detail,
    loadingDetail,
    detailError,
    loadDetail,
    resourcesByTopic,
    resourcesLoading,
    resourcesError,
    loadResources,
    notes,
    notesLoading,
    notesError,
    loadNotes,
    tab,
    handleTabChange,
    openTopicIds,
    setOpenTopicIds,
    openTopic,
    handleProgressChange,
    handleAddTopic,
    resourceHandlers,
    confirmDeleteOpen,
    setConfirmDeleteOpen,
    deleting,
    handleDelete,
  };
}
