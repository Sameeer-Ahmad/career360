import {
  Briefcase,
  Calendar,
  FileText,
  LayoutDashboard,
  Mail,
  Settings,
  Sparkles,
  BookOpen,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown with a "Soon" badge and not clickable — for screens hinted at but not built yet. */
  soon?: boolean;
};

export type NavSection = {
  /** Omitted for the top-level section (just Dashboard) — only grouped sections below it get a heading. */
  label?: string;
  items: NavItem[];
};

// Companies is deliberately not a nav destination — it's supporting data for
// Applications, not something users manage on its own. /companies still exists, unlinked.
export const NAV_SECTIONS: NavSection[] = [
  { items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Workspace",
    items: [
      { label: "Applications", href: "/applications", icon: Briefcase },
      { label: "Documents", href: "/documents", icon: FileText },
      { label: "Cover Letters", href: "/cover-letter", icon: Mail },
      { label: "Learning", href: "/learning", icon: BookOpen },
      { label: "Calendar", href: "/calendar", icon: Calendar },
      { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
    ],
  },
  { label: "Settings", items: [{ label: "Settings", href: "/settings", icon: Settings }] },
];
