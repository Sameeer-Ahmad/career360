import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/api-auth";
import {
  extractResumeText,
  ExtractedTextTooLongError,
  ExtractionFailedError,
  FileTooLargeError,
  NoExtractableTextError,
  UnsupportedFileTypeError,
} from "@/lib/documents/resume-extraction";

// Extracts plain text from an uploaded PDF/DOCX resume for review before
// saving. Never persists the original file — it stays in memory only.
export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A file is required" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await extractResumeText({
      buffer,
      mimeType: file.type,
      filename: file.name,
      size: file.size,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof UnsupportedFileTypeError ||
      error instanceof FileTooLargeError ||
      error instanceof NoExtractableTextError ||
      error instanceof ExtractedTextTooLongError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof ExtractionFailedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[api/documents/extract] unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong while reading this file. Please try again." },
      { status: 500 },
    );
  }
}
