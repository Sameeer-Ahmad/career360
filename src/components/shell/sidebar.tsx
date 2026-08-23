import Link from "next/link";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { UserProfile } from "@/components/shell/user-profile";
import { LogoutButton } from "@/components/shell/logout-button";
import { Divider } from "@/components/ui/divider";
import { Logo } from "@/components/brand/logo";

type ShellUser = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
};

export function Sidebar({ user }: { user: ShellUser }) {
  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:sticky md:top-0 md:flex">
      <div className="flex h-14 items-center px-4">
        <Link href="/dashboard" className="text-sidebar-foreground">
          <Logo />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <SidebarNav />
      </div>
      <div className="px-3 pb-3 pt-2">
        <Divider className="mb-3" />
        <UserProfile user={user} />
        <LogoutButton />
      </div>
    </aside>
  );
}
