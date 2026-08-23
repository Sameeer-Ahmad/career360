import {
  Briefcase,
  Building2,
  Calendar,
  FileText,
  LayoutDashboard,
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

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Applications", href: "/applications", icon: Briefcase },
  { label: "Preparation", href: "/preparation", icon: BookOpen },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "AI Assistant", href: "/ai-assistant", icon: Sparkles },
];
