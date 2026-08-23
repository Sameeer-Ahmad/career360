export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "career360-theme";

/** Inline, blocking script text — sets the `dark` class before first paint to avoid a flash of the wrong theme. */
export function themeInitScript(): string {
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(
    THEME_STORAGE_KEY,
  )});var r=(s==="light"||s==="dark")?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");if(r==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`;
}
