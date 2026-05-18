import type { ParserFn } from "../types";

export const parsePdf: ParserFn = async (buffer) => {
  const warnings: string[] = [];

  try {
    // Dynamic import to avoid bundling issues with pdf-parse
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(Buffer.from(buffer));

    const plainText = (data.text ?? "")
      .replace(/\f/g, "\n")            // form feed → newline
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")    // collapse excessive newlines
      .trim();

    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    const metadata: Record<string, string | undefined> = {};
    if (data.info?.Title) metadata.title = data.info.Title;
    if (data.info?.Author) metadata.author = data.info.Author;

    if (wordCount < 10) {
      warnings.push("Very little text extracted from PDF (may be scanned/image-based)");
    }

    return {
      plainText,
      wordCount,
      metadata,
      parserName: "pdf",
      warnings,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF parsing failed: ${msg}`);
  }
};
