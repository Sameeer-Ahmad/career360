import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, themeInitScript } from "@/lib/theme";

describe("themeInitScript", () => {
  it("reads from the correct localStorage key", () => {
    expect(themeInitScript()).toContain(JSON.stringify(THEME_STORAGE_KEY));
  });

  it("only adds the dark class, never removes it (server-rendered markup has no class to remove)", () => {
    const script = themeInitScript();
    expect(script).toContain('classList.add("dark")');
    expect(script).not.toContain("classList.remove");
  });

  it("falls back to the OS preference when nothing is stored", () => {
    expect(themeInitScript()).toContain("prefers-color-scheme: dark");
  });

  it("is wrapped in a try/catch so a blocked localStorage never breaks the page", () => {
    const script = themeInitScript();
    expect(script.startsWith("(function(){try{")).toBe(true);
    expect(script).toContain("catch(e){}");
  });
});
