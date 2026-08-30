"use client";

import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Dialog } from "@/components/ui/dialog";
import { Divider } from "@/components/ui/divider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScheduleLearningButton } from "@/components/learning/schedule-learning-button";
import { PathHeader } from "@/components/learning/learning-shared";
import { OverviewView } from "@/components/learning/overview-view";
import { TopicsView } from "@/components/learning/topics-view";
import { ResourcesView } from "@/components/learning/resources-view";
import { NotesView } from "@/components/learning/notes-view";
import { usePathWorkspace } from "@/components/learning/use-path-workspace";

// ---------------------------------------------------------------------------
// Path workspace — the full single-path experience: header + Overview /
// Topics / Resources / Notes, all views of the same fetched path. Resources
// are fetched once (aggregated across topics) and shared by every view
// that needs them; Notes are fetched once, lazily, on first opening the
// Notes tab.
// ---------------------------------------------------------------------------

export function PathWorkspace({
  pathId,
  backLabel,
  allowAddTopic,
  calendarConnected,
  onBack,
  onDeleted,
}: {
  pathId: string;
  backLabel: string;
  allowAddTopic: boolean;
  calendarConnected: boolean;
  onBack: () => void;
  onDeleted: () => void;
}) {
  const {
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
  } = usePathWorkspace({ pathId, onBack, onDeleted });

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Back to {backLabel}
      </button>

      {detailError ? (
        <ErrorState description={detailError} onRetry={loadDetail} />
      ) : (
        <>
          <PathHeader detail={detail} loading={loadingDetail} />

          {detail && (
            <ScheduleLearningButton learningPathId={detail.id} pathTitle={detail.title} calendarConnected={calendarConnected} />
          )}

          {detail && (
            <>
              <Tabs value={tab} onValueChange={handleTabChange}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="topics">Topics</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>
              </Tabs>

              {tab === "overview" && (
                <OverviewView
                  detail={detail}
                  resourcesByTopic={resourcesByTopic}
                  resourcesLoading={resourcesLoading}
                  onOpenTopic={openTopic}
                  onGoToResources={() => handleTabChange("resources")}
                />
              )}

              {tab === "topics" && (
                <TopicsView
                  detail={detail}
                  resourcesByTopic={resourcesByTopic}
                  resourcesLoading={resourcesLoading}
                  openTopicIds={openTopicIds}
                  onOpenChange={(topicId, open) => setOpenTopicIds((prev) => ({ ...prev, [topicId]: open }))}
                  onProgressChange={handleProgressChange}
                  resourceHandlers={resourceHandlers}
                  allowAddTopic={allowAddTopic}
                  onAddTopic={handleAddTopic}
                />
              )}

              {tab === "resources" && (
                <ResourcesView
                  detail={detail}
                  resourcesByTopic={resourcesByTopic}
                  loading={resourcesLoading}
                  error={resourcesError}
                  onRetry={loadResources}
                  resourceHandlers={resourceHandlers}
                />
              )}

              {tab === "notes" && (
                <NotesView notes={notes} loading={notesLoading} error={notesError} onRetry={loadNotes} onOpenTopic={openTopic} />
              )}

              <Divider />
              <div>
                <Button type="button" variant="destructive" size="sm" onClick={() => setConfirmDeleteOpen(true)}>
                  <Trash2 className="size-4" />
                  Delete Path
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !deleting && setConfirmDeleteOpen(false)}
        title="Delete learning path?"
        description={`This will permanently delete "${detail?.title ?? "this path"}" and its topics. This action cannot be undone.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" disabled={deleting} onClick={handleDelete}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
