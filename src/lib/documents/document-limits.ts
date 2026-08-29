// Kept separate from documents.ts (Prisma) and resume-extraction.ts (PDF/DOCX
// parsers) so client components can import just these constants.
export const MAX_TITLE_LENGTH = 200;
// Generous enough for a Master Resume covering multiple roles and projects.
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
