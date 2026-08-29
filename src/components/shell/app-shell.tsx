import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import { MobileNavProvider, MobileNavDrawer } from "@/components/shell/mobile-nav";
import { ToastProvider } from "@/components/ui/toast";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  return (
    <ToastProvider>
      <MobileNavProvider>
        <div className="flex min-h-screen">
          <Sidebar user={user} />
          <MobileNavDrawer user={user} />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </MobileNavProvider>
    </ToastProvider>
  );
}
