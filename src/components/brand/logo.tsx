import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/brand/logo-mark";

/** Full Career360 lockup: icon mark + two-tone wordmark, with an optional tagline. */
export function Logo({
  className,
  markClassName,
  showTagline = false,
}: {
  className?: string;
  markClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark className={cn("size-7 shrink-0", markClassName)} />
      <div className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight">
          Career<span className="text-primary">360</span>
        </span>
        {showTagline && (
          <span className="mt-0.5 text-[11px] text-muted-foreground">Your complete career workspace</span>
        )}
      </div>
    </div>
  );
}
