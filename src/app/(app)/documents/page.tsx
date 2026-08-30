import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Sparkles } from "lucide-react";
import { auth } from "@/auth";
import { listDocuments, listResumeWorkspace } from "@/lib/documents/documents";
import { Header } from "@/components/shell/header";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentRowActions } from "@/components/documents/document-row-actions";
import { DocumentCard } from "@/components/documents/document-card";
import { DOCUMENT_TYPE_LABELS, formatDate } from "@/lib/format";

type WorkspaceResume = Awaited<ReturnType<typeof listResumeWorkspace>>["main"][number];

function ResumeGroup({
  title,
  badgeLabel,
  badgeVariant,
  emptyTitle,
  emptyDescription,
  resumes,
}: {
  title: string;
  badgeLabel: string;
  badgeVariant: "primary" | "info";
  emptyTitle: string;
  emptyDescription: string;
  resumes: WorkspaceResume[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>

      {resumes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <Link href="/documents/new" className={buttonVariants("primary", "sm")}>
              Add Resume
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardHeader className="flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/documents/${resume.id}`} className="hover:underline">
                      <CardTitle className="text-base">{resume.title}</CardTitle>
                    </Link>
                    <Badge variant={badgeVariant}>{badgeLabel}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Updated {formatDate(resume.updatedAt)} ·{" "}
                    {resume.versions.length === 0
                      ? "No tailored versions yet"
                      : `${resume.versions.length} tailored ${resume.versions.length === 1 ? "version" : "versions"}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/resume-analysis?documentId=${resume.id}`}
                    className={buttonVariants("outline", "sm")}
                  >
                    <Sparkles className="size-4" />
                    Analyze
                  </Link>
                  <DocumentRowActions documentId={resume.id} label={resume.title} />
                </div>
              </CardHeader>

              {resume.versions.length > 0 && (
                <>
                  <Divider />
                  <CardContent className="space-y-2 pt-4">
                    {resume.versions.map((version) => (
                      <div
                        key={version.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{version.title}</p>
                          {version.application && (
                            <p className="truncate text-xs text-muted-foreground">
                              {version.application.jobTitle} at {version.application.company.name}
                            </p>
                          )}
                        </div>
                        <Link href={`/documents/${version.id}`} className={buttonVariants("ghost", "sm")}>
                          Open
                        </Link>
                      </div>
                    ))}
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const userId = session.user.id;

  const [{ main, master }, allDocuments] = await Promise.all([
    listResumeWorkspace(userId),
    listDocuments(userId),
  ]);
  const otherDocuments = allDocuments.filter((doc) => doc.type !== "RESUME");

  return (
    <>
      <Header
        title="Documents"
        actions={
          <Link href="/documents/new" className={buttonVariants("primary", "sm")}>
            Add Document
          </Link>
        }
      />
      <main className="flex-1 space-y-8 p-4 md:p-6">
        <ResumeGroup
          title="Main Resume"
          badgeLabel="Main"
          badgeVariant="primary"
          emptyTitle="No Main Resume yet"
          emptyDescription="Add the resume you'd normally submit to jobs. Career360 can tailor a version of it for any application."
          resumes={main}
        />

        <ResumeGroup
          title="Master Resume"
          badgeLabel="Master"
          badgeVariant="info"
          emptyTitle="No Master Resume yet (optional)"
          emptyDescription="Add a longer career-content library — extra roles, projects, and skills Career360 can pull from when tailoring your Main Resume. Not required."
          resumes={master}
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">Other Documents</h2>

          {otherDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Cover letters and other documents you add will show up here.
            </p>
          ) : (
            <>
              <TableContainer className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Last updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {otherDocuments.map((document) => {
                      const titleHref =
                        document.type === "COVER_LETTER" && document.applicationId
                          ? `/cover-letter?applicationId=${document.applicationId}`
                          : `/documents/${document.id}`;
                      return (
                        <TableRow key={document.id}>
                          <TableCell className="font-medium">
                            <Link href={titleHref} className="hover:underline">
                              {document.title}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="neutral">{DOCUMENT_TYPE_LABELS[document.type]}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(document.updatedAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DocumentRowActions
                              documentId={document.id}
                              label={document.title}
                              type={document.type}
                              applicationId={document.applicationId}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <div className="space-y-3 md:hidden">
                {otherDocuments.map((document) => (
                  <DocumentCard key={document.id} document={document} />
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </>
  );
}
