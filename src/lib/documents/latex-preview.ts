// Rough plain-text approximation for preview only — not a LaTeX compiler,
// doesn't reproduce the actual PDF layout.
export function approximateLatexPreview(source: string): string {
  let text = source;

  // Strip comments (a bare % not preceded by a backslash-escape).
  text = text.replace(/(^|[^\\])%.*$/gm, "$1");

  // Drop preamble/document-structure commands entirely (no content value).
  text = text.replace(/\\documentclass(\[[^\]]*])?\{[^}]*}/g, "");
  text = text.replace(/\\usepackage(\[[^\]]*])?\{[^}]*}/g, "");
  text = text.replace(/\\newcommand\{[^}]*}(\[[^\]]*])?\{[^}]*}/g, "");
  text = text.replace(/\\(begin|end)\{document}/g, "");
  text = text.replace(/\\(begin|end)\{[a-zA-Z*]+}(\[[^\]]*])?/g, "");

  // Headings/sections become their own line.
  text = text.replace(/\\(section|subsection|subsubsection|chapter)\*?\{([^}]*)}/g, "\n\n$2\n");

  // Common inline formatting commands — keep the text, drop the markup.
  text = text.replace(/\\(textbf|textit|emph|underline|texttt|textsc)\{([^}]*)}/g, "$2");

  // \item becomes a plain bullet.
  text = text.replace(/\\item\b\s*/g, "- ");

  // Line breaks / spacing commands.
  text = text.replace(/\\\\/g, "\n");
  text = text.replace(/\\(vspace|hspace)\{[^}]*}/g, "");
  text = text.replace(/\\(noindent|newpage|clearpage|hrule|hline)\b/g, "");

  // Any remaining \command{...} — keep the braced content, drop the command name.
  text = text.replace(/\\[a-zA-Z]+\*?(\[[^\]]*])?\{([^}]*)}/g, "$2");

  // Any remaining bare \command with no braces — drop it.
  text = text.replace(/\\[a-zA-Z]+\*?/g, "");

  // Collapse leftover braces and excess whitespace.
  text = text.replace(/[{}]/g, "");
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return text;
}
