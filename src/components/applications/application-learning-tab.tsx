import Link from "next/link";
import { BookOpen } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatDate, LEARNING_SOURCE_LABELS } from "@/lib/format";
import type { getLearningPathDetail } from "@/lib/learning/learning";

type LearningPathWithProgress = Awaited<ReturnType<typeof getLearningPathDetail>>;

export function ApplicationLearningTab({
  applicationId,
  learningPathsWithProgress,
}: {
  applicationId: string;
  learningPathsWithProgress: LearningPathWithProgress[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Learning Path</h3>
        <Link href={`/learning?applicationId=${applicationId}`} className={buttonVariants("outline", "sm")}>
          <BookOpen className="size-4" />
          Recommend Learning
        </Link>
      </div>
      {learningPathsWithProgress.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No learning path yet"
          description="Get a personalized learning plan based on this job's requirements."
          className="py-10"
        />
      ) : (
        <div className="space-y-2">
          {learningPathsWithProgress.map((path) => (
            <div key={path.id} className="space-y-2.5 rounded-md border border-border px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{path.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {LEARNING_SOURCE_LABELS[path.source]} · Updated {formatDate(path.updatedAt)}
                  </p>
                </div>
                <Link href={`/learning?applicationId=${applicationId}`} className={buttonVariants("ghost", "sm")}>
                  Open
                </Link>
              </div>
              {path.progressSummary.total > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {path.progressSummary.completed} of {path.progressSummary.total} topic
                      {path.progressSummary.total === 1 ? "" : "s"} completed
                    </span>
                    <span>{path.progressSummary.percentage}%</span>
                  </div>
                  <ProgressBar percentage={path.progressSummary.percentage} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
