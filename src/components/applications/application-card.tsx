import Link from "next/link";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApplicationRowActions } from "@/components/applications/application-row-actions";
import { formatDate } from "@/lib/format";
import type { Application, Company } from "@prisma/client";

type ApplicationWithCompany = Application & { company: Company };

export function ApplicationCard({ application }: { application: ApplicationWithCompany }) {
  const label = `${application.jobTitle} at ${application.company.name}`;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/applications/${application.id}`} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{application.jobTitle}</p>
          <p className="truncate text-sm text-muted-foreground">{application.company.name}</p>
        </Link>
        <ApplicationRowActions applicationId={application.id} label={label} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={application.status} />
        {application.priority && <PriorityBadge priority={application.priority} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {application.location && <span>{application.location}</span>}
        <span>Applied {formatDate(application.appliedAt)}</span>
      </div>
    </Card>
  );
}
