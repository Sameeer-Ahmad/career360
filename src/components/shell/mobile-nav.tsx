"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserProfile, type ShellUser } from "@/components/shell/user-profile";
import { LogoutButton } from "@/components/shell/logout-button";
import { Divider } from "@/components/ui/divider";
import { IconButton } from "@/components/ui/icon-button";
import { Logo } from "@/components/brand/logo";

type MobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const MobileNavContext = createContext<MobileNavContextValue | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes (e.g. after tapping a nav link).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  return (
    <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
  );
}

function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("Must be used within <MobileNavProvider>");
  return ctx;
}

export function MobileNavTrigger() {
  const { setOpen } = useMobileNav();
  return (
    <IconButton aria-label="Open navigation menu" className="md:hidden" onClick={() => setOpen(true)}>
      <Menu />
    </IconButton>
  );
}

export function MobileNavDrawer({ user }: { user: ShellUser }) {
  const { open, setOpen } = useMobileNav();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, setOpen]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="relative flex h-full w-72 max-w-[80vw] flex-col bg-sidebar text-sidebar-foreground shadow-popover"
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <IconButton aria-label="Close navigation menu" onClick={() => setOpen(false)}>
            <X />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <SidebarNav onNavigate={() => setOpen(false)} />
        </div>
        <div className="px-3 pb-3 pt-2">
          <Divider className="mb-3" />
          <UserProfile user={user} />
          <LogoutButton />
        </div>
      </div>
    </div>,
    document.body,
  );
}
