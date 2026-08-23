import type { ComponentType } from "react";
import { Header } from "@/components/shell/header";
import { EmptyState } from "@/components/ui/empty-state";

export function PlaceholderPage({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <>
      <Header title={title} />
      <main className="flex-1 p-4 md:p-6">
        <EmptyState icon={icon} title={`${title} is coming soon`} description={description} />
      </main>
    </>
  );
}
