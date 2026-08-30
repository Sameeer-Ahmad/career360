import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const PRODUCT_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Sign In", href: "/login" },
  { label: "Get Started", href: "/signup" },
];

const COMPANY_LINKS = [
  { label: "Resources", href: "/resources" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

/** Shared footer for every public page (landing, Resources, Privacy, Terms) — one place so the link set stays consistent everywhere. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:flex-row sm:items-start sm:justify-between md:px-6">
        <div className="max-w-xs">
          <Link href="/">
            <Logo markClassName="size-7" />
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            A complete workspace for managing and improving your job search.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-12 gap-y-8">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Product</p>
            {PRODUCT_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Company</p>
            {COMPANY_LINKS.map((link) => (
              <Link key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
            <a href="mailto:support@career360.app" className="text-sm text-muted-foreground hover:text-foreground">
              Contact
            </a>
          </div>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-6xl px-4 text-xs text-muted-foreground md:px-6">
        Career360 — your complete career workspace.
      </p>
    </footer>
  );
}
