"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV_SECTIONS } from "@/components/shell/nav-items";
import { Badge } from "@/components/ui/badge";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label ?? "top"} className="flex flex-col gap-1">
          {section.label && (
            <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {section.label}
            </h2>
          )}
          {section.items.map((item) => {
            const active = !item.soon && pathname.startsWith(item.href);
            const Icon = item.icon;

            if (item.soon) {
              return (
                <span
                  key={item.href}
                  aria-disabled="true"
                  className="flex cursor-not-allowed items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground opacity-60"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4.5" aria-hidden="true" />
                    {item.label}
                  </span>
                  <Badge variant="neutral">Soon</Badge>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "bg-sidebar-active-bg text-sidebar-active-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-active-bg/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="size-4.5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
