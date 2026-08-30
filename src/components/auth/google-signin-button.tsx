import { signIn } from "@/auth";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/components/auth/google-icon";

/** Unchanged Google OAuth flow (src/auth.ts's Google provider) — this is purely a restyle, same inline server-action sign-in the original /login page already used. */
export function GoogleSignInButton({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google", { redirectTo: "/dashboard" });
      }}
    >
      <Button type="submit" variant="outline" size="lg" className="w-full gap-2.5">
        <GoogleIcon className="size-4.5" />
        {label}
      </Button>
    </form>
  );
}
