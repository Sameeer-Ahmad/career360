import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function LoadingState({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-2 py-16 text-center", className)}
    >
      <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
