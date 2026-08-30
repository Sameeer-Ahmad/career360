import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { SignupForm } from "@/components/auth/signup-form";
import { Divider } from "@/components/ui/divider";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Create your account"
      description="Start building your complete job-search workspace."
      showBackLink
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <GoogleSignInButton label="Continue with Google" />

        <div className="flex items-center gap-3">
          <Divider className="flex-1" />
          <span className="text-xs text-muted-foreground">or continue with email</span>
          <Divider className="flex-1" />
        </div>

        <SignupForm />
      </div>
    </AuthShell>
  );
}
