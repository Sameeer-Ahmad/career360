import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/account/current-user";
import { getConnectionSummary } from "@/lib/google-calendar/connection";
import { Header } from "@/components/shell/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { CalendarIntegrationCard } from "@/components/settings/calendar-integration-card";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const justConnected = firstParam(resolvedSearchParams.connected) === "1";
  const oauthError = firstParam(resolvedSearchParams.error) ?? null;

  const calendarConnection = await getConnectionSummary(user.id);

  const isGoogleAccount = !user.hasPassword;

  return (
    <>
      <Header title="Settings" />
      <main className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>How you sign in to Career360.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isGoogleAccount ? (
                <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                  <ShieldCheck className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Signed in with Google</p>
                    <p className="text-xs text-muted-foreground">
                      {user.email} · your password is managed by Google, not Career360.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
                    <KeyRound className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Email &amp; password</p>
                      <p className="text-xs text-muted-foreground">
                        Forgot your password?{" "}
                        <Link href="/forgot-password" className="text-primary hover:underline">
                          Reset it
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                  <Divider />
                  <ChangePasswordForm />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connected third-party accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <CalendarIntegrationCard
                initialConnected={calendarConnection.connected}
                initialEmail={calendarConnection.email}
                justConnected={justConnected}
                oauthError={oauthError}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data &amp; Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>
              </div>
              <Divider />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete account</p>
                  <p className="text-xs text-muted-foreground">Permanently delete your account and all its data.</p>
                </div>
                <DeleteAccountDialog />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
