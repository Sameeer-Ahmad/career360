import Link from "next/link";
import { PriorityBadge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ApplicationRowActions } from "@/components/applications/application-row-actions";
import { ApplicationStatusSelect } from "@/components/applications/application-status-select";
import { formatDate } from "@/lib/format";
import { buildApplicationSlug } from "@/lib/applications/application-slug";
import type { Application, Company } from "@prisma/client";

type ApplicationWithCompany = Application & { company: Company };

export function ApplicationCard({ application }: { application: ApplicationWithCompany }) {
  const label = `${application.jobTitle} at ${application.company.name}`;
  const href = `/applications/${buildApplicationSlug(application)}`;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={href} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{application.jobTitle}</p>
          <p className="truncate text-sm text-muted-foreground">{application.company.name}</p>
        </Link>
        <ApplicationRowActions applicationId={application.id} href={href} label={label} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ApplicationStatusSelect applicationId={application.id} initialStatus={application.status} label={label} />
        {application.priority && <PriorityBadge priority={application.priority} />}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {application.location && <span>{application.location}</span>}
        <span>Applied {formatDate(application.appliedAt)}</span>
      </div>
    </Card>
  );
}
