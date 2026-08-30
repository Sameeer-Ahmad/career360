import Link from "next/link";
import { Divider } from "@/components/ui/divider";
import { ApplicationCalendarActions } from "@/components/applications/application-calendar-actions";
import { ApplicationFollowUps, type FollowUpItem } from "@/components/applications/application-follow-ups";
import { formatDateTime } from "@/lib/format";

export function ApplicationInterviewsTab({
  applicationId,
  jobTitle,
  companyName,
  calendarConnected,
  interviewAt,
  initialInterviewEvent,
  initialFollowUps,
}: {
  applicationId: string;
  jobTitle: string;
  companyName: string;
  calendarConnected: boolean;
  interviewAt: Date | null;
  initialInterviewEvent: { id: string; title: string; start: string | null } | null;
  initialFollowUps: FollowUpItem[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Interview</h3>
        {interviewAt ? (
          <p className="mb-2 text-sm text-foreground">{formatDateTime(interviewAt)}</p>
        ) : (
          <p className="mb-2 text-sm text-muted-foreground">
            No interview scheduled yet.{" "}
            <Link href={`/applications/${applicationId}/edit`} className="font-medium text-primary hover:underline">
              Add an interview date
            </Link>
            .
          </p>
        )}
        <ApplicationCalendarActions
          applicationId={applicationId}
          jobTitle={jobTitle}
          companyName={companyName}
          calendarConnected={calendarConnected}
          interviewAt={interviewAt ? interviewAt.toISOString() : null}
          initialInterviewEvent={initialInterviewEvent}
        />
      </div>

      <Divider />

      {calendarConnected ? (
        <ApplicationFollowUps
          applicationId={applicationId}
          companyName={companyName}
          calendarConnected={calendarConnected}
          initialFollowUps={initialFollowUps}
        />
      ) : (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Follow-ups</h3>
          <p className="text-sm text-muted-foreground">
            Connect Google Calendar to schedule follow-ups for this application.
          </p>
        </div>
      )}
    </div>
  );
}
