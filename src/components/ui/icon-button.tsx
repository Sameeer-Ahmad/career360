import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import type { ButtonVariant } from "@/components/ui/button";

export type IconButtonSize = "sm" | "md" | "lg";

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-8 [&_svg]:size-4",
  md: "size-9 [&_svg]:size-4.5",
  lg: "size-11 [&_svg]:size-5",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover hover:text-primary-hover-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-80",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

export function iconButtonVariants(variant: ButtonVariant = "ghost", size: IconButtonSize = "md") {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-md transition-all active:scale-[0.94]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 disabled:active:scale-100",
    variantClasses[variant],
    sizeClasses[size],
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: IconButtonSize;
  /** Required — icon-only buttons must be labeled for assistive tech. */
  "aria-label": string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = "ghost", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(iconButtonVariants(variant, size), className)}
        {...props}
      />
    );
  },
);
IconButton.displayName = "IconButton";
