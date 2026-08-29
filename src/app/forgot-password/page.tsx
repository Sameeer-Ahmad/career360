import Link from "next/link";
import { MailQuestion } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { buttonVariants } from "@/components/ui/button";

/**
 * Career360 has no password-reset infrastructure yet (no reset-token
 * model, no transactional email sending) — this page says so honestly
 * instead of pretending to send a reset email.
 */
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Password reset isn't available yet"
      description="Career360 doesn't have email-based password reset built yet."
      footer={
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <MailQuestion className="size-6 text-primary" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">
          Email-based password reset hasn&apos;t been built yet. If you originally created your account with Google,
          you can still sign in that way from the login page.
        </p>
        <Link href="/login" className={buttonVariants("outline", "sm")}>
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
