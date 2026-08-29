import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import type { DocumentContentFormat } from "@prisma/client";
import {
  ACCEPTED_UPLOAD_MIME_TYPES,
  MAX_DOCUMENT_CONTENT_LENGTH,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  type UploadFileKind,
} from "@/lib/documents/document-limits";

export class UnsupportedFileTypeError extends Error {
  constructor() {
    super("Unsupported file type. Please upload a PDF, DOCX, or .tex file.");
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super(`File is too large. Please upload a file under ${Math.round(MAX_UPLOAD_FILE_SIZE_BYTES / (1024 * 1024))} MB.`);
  }
}

export class ExtractionFailedError extends Error {
  constructor(message = "Could not read this file. It may be corrupted or in an unsupported format.") {
    super(message);
  }
}

export class NoExtractableTextError extends Error {
  constructor() {
    super(
      "No readable text was found in this file. It may be a scanned image rather than a text-based document — try pasting the resume text manually instead.",
    );
  }
}

export class ExtractedTextTooLongError extends Error {
  constructor() {
    super(
      `The extracted text is longer than ${MAX_DOCUMENT_CONTENT_LENGTH.toLocaleString()} characters. Please trim the document and try again, or paste a shortened version manually.`,
    );
  }
}

// Below this, treat extraction as having effectively failed (e.g. a
// scanned/image-only PDF with no real text layer) rather than silently
// accepting near-empty content.
const MIN_EXTRACTED_TEXT_LENGTH = 50;

function detectFileKind(mimeType: string, filename: string): UploadFileKind | null {
  if (mimeType in ACCEPTED_UPLOAD_MIME_TYPES) {
    return ACCEPTED_UPLOAD_MIME_TYPES[mimeType as keyof typeof ACCEPTED_UPLOAD_MIME_TYPES];
  }
  // Some browsers/OSes send a generic octet-stream MIME type — fall back to
  // the file extension as a secondary signal (this only selects which parser
  // to try; the parser itself will reject content that isn't actually
  // valid).
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".docx")) return "docx";
  if (lower.endsWith(".tex")) return "tex";
  return null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  } catch (error) {
    console.error("[resume-extraction] PDF extraction failed:", error);
    throw new ExtractionFailedError();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  } catch (error) {
    console.error("[resume-extraction] DOCX extraction failed:", error);
    throw new ExtractionFailedError();
  }
}

/**
 * Reads a .tex file as strict UTF-8 text — no extraction, no normalization,
 * no trimming. LaTeX source is preserved exactly as uploaded (macros,
 * packages, comments, formatting) so the review step shows precisely what
 * was in the file. `fatal: true` makes invalid byte sequences throw instead
 * of silently becoming replacement characters, which is how a binary file
 * renamed to .tex gets caught rather than saved as garbled "text".
 */
function readLatexSource(buffer: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    throw new ExtractionFailedError(
      "This .tex file doesn't appear to be valid UTF-8 text — it may be corrupted or not a real LaTeX source file.",
    );
  }
}

export type ExtractedResume = {
  content: string;
  fileKind: UploadFileKind;
  contentFormat: DocumentContentFormat;
};

/**
 * Extracts resume content from an uploaded PDF, DOCX, or .tex file,
 * server-side only. The original file is never persisted or sent anywhere
 * else — the buffer exists only for the duration of this call. Throws a
 * specific, user-safe error for every failure mode; never returns unusable
 * content silently.
 *
 * PDF/DOCX go through real extraction and light whitespace normalization
 * (they're derived text, not a source format). .tex is read as-is: no
 * normalization, no trimming — the LaTeX source is preserved exactly.
 */
export async function extractResumeText(file: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  size: number;
}): Promise<ExtractedResume> {
  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    throw new FileTooLargeError();
  }

  const fileKind = detectFileKind(file.mimeType, file.filename);
  if (!fileKind) {
    throw new UnsupportedFileTypeError();
  }

  let content: string;
  if (fileKind === "tex") {
    content = readLatexSource(file.buffer);
  } else {
    const rawText = fileKind === "pdf" ? await extractPdfText(file.buffer) : await extractDocxText(file.buffer);
    content = rawText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  if (content.trim().length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new NoExtractableTextError();
  }
  if (content.length > MAX_DOCUMENT_CONTENT_LENGTH) {
    throw new ExtractedTextTooLongError();
  }

  return { content, fileKind, contentFormat: fileKind === "tex" ? "LATEX" : "PLAIN" };
}
