import type { ParserFn } from "../types";

export const parseDocx: ParserFn = async (buffer) => {
  const warnings: string[] = [];

  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });

    const plainText = (result.value ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n{4,}/g, "\n\n\n")
      .trim();

    const wordCount = plainText.split(/\s+/).filter(Boolean).length;

    if (result.messages && result.messages.length > 0) {
      for (const msg of result.messages) {
        warnings.push(`[mammoth] ${msg.type}: ${msg.message}`);
      }
    }

    if (wordCount < 10) {
      warnings.push("Very little text extracted from DOCX");
    }

    return {
      plainText,
      wordCount,
      metadata: {},
      parserName: "docx",
      warnings,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`DOCX parsing failed: ${msg}`);
  }
};
