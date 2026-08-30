import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { LoginForm } from "@/components/auth/login-form";
import { Divider } from "@/components/ui/divider";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to continue to your career workspace."
      showBackLink
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create account
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

        <LoginForm />
      </div>
    </AuthShell>
  );
}
