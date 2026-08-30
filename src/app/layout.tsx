import type { Metadata } from "next";
import { Geist_Mono, Instrument_Serif, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Editorial accent serif — italic-only, used sparingly for a short emphasis
// word/phrase inside major landing-page headlines (see .font-display-italic
// in globals.css). Never used for body copy or UI chrome.
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Career360",
  description: "Career360 — your complete career workspace.",
};

// React 19 logs a spurious dev warning for any inline <script>, including the
// theme-init script below (github.com/shadcn-ui/ui/issues/10104). This patches
// console.error to drop just that message; must be a sync inline script so it
// installs before React's hydration pass reaches the theme-init script.
const CONSOLE_ERROR_FILTER_SCRIPT = `(function(){try{var e=console.error;console.error=function(){var a=arguments[0];if(typeof a==="string"&&a.indexOf("Encountered a script tag while rendering")!==-1)return;return e.apply(console,arguments);};}catch(_){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Blocking, pre-hydration script — avoids a flash of the wrong theme. */}
        <script dangerouslySetInnerHTML={{ __html: CONSOLE_ERROR_FILTER_SCRIPT + themeInitScript() }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
