import type { ReactNode } from "react";
import { MobileNavTrigger } from "@/components/shell/mobile-nav";
import { HeaderSearch } from "@/components/shell/header-search";
import { MobileSearchTrigger } from "@/components/shell/mobile-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm md:px-6">
      <MobileNavTrigger />
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight md:flex-none">
        {title}
      </h1>

      {/* No room for a full search field alongside the title on narrow
          screens, so it's hidden below md — MobileSearchTrigger provides
          the compact equivalent (an icon that opens a full-screen overlay
          around this exact same HeaderSearch) instead of dropping search
          entirely on mobile. */}
      <div className="hidden flex-1 items-center md:flex">
        <HeaderSearch />
      </div>

      <div className="flex items-center gap-1.5">
        {actions}
        <MobileSearchTrigger />
        <ThemeToggle />
      </div>
    </header>
  );
}
