// Kept separate from src/lib/documents.ts (which imports the Prisma client)
// and src/lib/resume-extraction.ts (which imports the PDF/DOCX parsers) so
// client components can import just these constants without pulling
// server-only code into the browser bundle.
export const MAX_TITLE_LENGTH = 200;
// Raised from 15,000 to accommodate a Master Resume covering multiple roles,
// projects, and bullet variations (spec calls for "3-4+ pages or even longer").
export const MAX_DOCUMENT_CONTENT_LENGTH = 40000;

export const MAX_UPLOAD_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB

export const ACCEPTED_UPLOAD_MIME_TYPES = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  // Browsers are inconsistent about the MIME type for .tex (many report
  // application/octet-stream or leave it blank) — the filename-extension
  // fallback in resume-extraction.ts is the primary detection path for it.
  "text/x-tex": "tex",
  "application/x-tex": "tex",
} as const;

export type UploadFileKind = (typeof ACCEPTED_UPLOAD_MIME_TYPES)[keyof typeof ACCEPTED_UPLOAD_MIME_TYPES];
