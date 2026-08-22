type ClassValue = string | number | false | null | undefined;

/** Joins class names, dropping falsy values. No conflict-resolution — keep variants mutually exclusive. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
