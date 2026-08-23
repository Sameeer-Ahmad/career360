import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { auth } from "@/auth";
import { listApplications } from "@/lib/applications";
import { Header } from "@/components/shell/header";
import { buttonVariants } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApplicationRowActions } from "@/components/applications/application-row-actions";
import { ApplicationCard } from "@/components/applications/application-card";
import { formatDate } from "@/lib/format";

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);
  const applications = await listApplications(userId);

  return (
    <>
      <Header
        title="Applications"
        actions={
          <Link href="/applications/new" className={buttonVariants("primary", "sm")}>
            Add Application
          </Link>
        }
      />
      <main className="flex-1 space-y-4 p-4 md:p-6">
        {applications.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No applications yet"
            description="Add your first application to start tracking your job search."
            action={
              <Link href="/applications/new" className={buttonVariants("primary", "sm")}>
                Add Application
              </Link>
            }
          />
        ) : (
          <>
            {/* Desktop / tablet: table. Mobile: stacked cards (see below). */}
            <TableContainer className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => {
                    const label = `${app.jobTitle} at ${app.company.name}`;
                    return (
                      <TableRow key={app.id}>
                        <TableCell className="font-medium">{app.company.name}</TableCell>
                        <TableCell>{app.jobTitle}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {app.location ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(app.appliedAt)}
                        </TableCell>
                        <TableCell>
                          {app.priority ? <PriorityBadge priority={app.priority} /> : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={app.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <ApplicationRowActions applicationId={app.id} label={label} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>

            <div className="space-y-3 md:hidden">
              {applications.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
