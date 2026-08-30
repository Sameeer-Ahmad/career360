"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { HeaderSearch } from "@/components/shell/header-search";

/**
 * The compact mobile treatment for global search — a small trigger icon
 * (the search bar itself has no room next to the title/hamburger below
 * md) that opens a full-screen overlay containing the exact same
 * HeaderSearch used on desktop. No second search implementation.
 */
export function MobileSearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <>
      <IconButton aria-label="Search applications" className="md:hidden" onClick={() => setOpen(true)}>
        <Search />
      </IconButton>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
            <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
              <HeaderSearch autoFocus onNavigate={() => setOpen(false)} className="max-w-none" />
              <IconButton aria-label="Close search" onClick={() => setOpen(false)}>
                <X />
              </IconButton>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
