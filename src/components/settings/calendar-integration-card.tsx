"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  denied: "Google Calendar connection was not completed.",
  invalid_state: "That connection attempt could not be verified. Please try again.",
  connection_failed: "Could not finish connecting Google Calendar. Please try again.",
};

export function CalendarIntegrationCard({
  initialConnected,
  initialEmail,
  justConnected,
  oauthError,
}: {
  initialConnected: boolean;
  initialEmail: string | null;
  justConnected: boolean;
  oauthError: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [connected, setConnected] = useState(initialConnected);
  const [email, setEmail] = useState(initialEmail);
  const [disconnecting, setDisconnecting] = useState(false);
  const announced = useRef(false);

  // Fires once for the redirect back from Google — then clears ?connected=/
  // ?error= from the URL so refreshing the page doesn't re-announce it.
  useEffect(() => {
    if (announced.current) return;
    announced.current = true;
    if (justConnected) {
      toast.success("Google Calendar connected");
      router.replace("/settings");
    } else if (oauthError) {
      toast.error(OAUTH_ERROR_MESSAGES[oauthError] ?? "Could not connect Google Calendar.");
      router.replace("/settings");
    }
  }, [justConnected, oauthError, router, toast]);

  async function handleDisconnect() {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      const response = await fetch("/api/calendar/disconnect", { method: "POST" });
      if (!response.ok) {
        toast.error("Could not disconnect Google Calendar. Please try again.");
        return;
      }
      setConnected(false);
      setEmail(null);
      toast.success("Google Calendar disconnected");
    } catch {
      toast.error("Network error — please check your connection and try again.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <CalendarDays className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-foreground">Google Calendar</p>
          <p className="text-xs text-muted-foreground">
            {connected ? (email ? `Connected · ${email}` : "Connected") : "Not connected"}
          </p>
        </div>
      </div>
      {connected ? (
        <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
          {disconnecting ? "Disconnecting…" : "Disconnect"}
        </Button>
      ) : (
        <a href="/api/calendar/connect?returnTo=/settings" className={buttonVariants("outline", "sm")}>
          Connect Google Calendar
        </a>
      )}
    </div>
  );
}
