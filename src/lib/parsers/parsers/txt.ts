import type { ParserFn } from "../types";

/** Detect if buffer is likely GBK/GB2312 encoded (common for Chinese text files) */
function looksLikeGarbled(text: string): boolean {
  // If many replacement characters or unusual byte patterns, likely wrong encoding
  const replacementCount = (text.match(/�/g) ?? []).length;
  return replacementCount > text.length * 0.05; // >5% replacement chars
}

function tryDecode(buffer: ArrayBuffer): string {
  // Try UTF-8 first
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (!looksLikeGarbled(utf8) || utf8.length < 10) return utf8;

  // Try GBK
  try {
    const gbk = new TextDecoder("gbk", { fatal: false }).decode(buffer);
    if (!looksLikeGarbled(gbk)) return gbk;
  } catch { /* GBK not available in this runtime */ }

  // Fall back to UTF-8 with replacement
  return utf8;
}

export const parseTxt: ParserFn = async (buffer, fileName) => {
  let plainText = tryDecode(buffer);

  // Normalize whitespace
  plainText = plainText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

  if (!plainText) {
    return {
      plainText: "",
      wordCount: 0,
      metadata: {},
      parserName: "txt",
      warnings: ["File appears to be empty"],
    };
  }

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return {
    plainText,
    wordCount,
    metadata: { title: fileName.replace(/\.[^.]+$/, "") },
    parserName: "txt",
    warnings: [],
  };
};
