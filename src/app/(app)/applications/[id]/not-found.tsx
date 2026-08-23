import Link from "next/link";
import { SearchX } from "lucide-react";
import { Header } from "@/components/shell/header";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <>
      <Header title="Application not found" />
      <main className="flex-1 p-4 md:p-6">
        <EmptyState
          icon={SearchX}
          title="Application not found"
          description="This application doesn't exist or you don't have access to it."
          action={
            <Link href="/applications" className={buttonVariants("primary", "sm")}>
              Back to Applications
            </Link>
          }
        />
      </main>
    </>
  );
}
