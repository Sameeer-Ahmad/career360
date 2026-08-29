"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastVariant = "success" | "error";
type ToastItem = { id: number; message: string; variant: ToastVariant };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;

// Mounted once in AppShell (not per-page) so a toast fired right before a
// `router.push` survives the navigation instead of unmounting with the page.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  // Gate the portal on a post-hydration flag rather than `typeof document`,
  // so the first client render still matches the server-rendered HTML.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: this is the one-tick-after-hydration signal itself, not state derived from a prop/external value.
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, variant: ToastVariant) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    success: useCallback((message: string) => push(message, "success"), [push]),
    error: useCallback((message: string) => push(message, "error"), [push]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:items-end"
            aria-live="polite"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                role={t.variant === "error" ? "alert" : "status"}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg border bg-card px-4 py-3 text-sm shadow-popover",
                  t.variant === "success" ? "border-status-offer-fg/30" : "border-status-rejected-fg/30",
                )}
              >
                {t.variant === "error" && (
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-status-rejected-fg" aria-hidden="true" />
                )}
                <p className={cn("flex-1", t.variant === "success" ? "text-status-offer-fg" : "text-foreground")}>
                  {t.variant === "success" ? `✓ ${t.message}` : t.message}
                </p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
