import type { ParserOutput, ParserFn } from "./types";
import { parseTxt } from "./parsers/txt";
import { parseHtml } from "./parsers/html";
import { parseMd } from "./parsers/md";

// PDF and DOCX are lazy-loaded to avoid bundling native deps when unused
const PARSER_MAP: Record<string, () => Promise<ParserFn>> = {
  txt: async () => parseTxt,
  html: async () => parseHtml,
  htm: async () => parseHtml,
  md: async () => parseMd,
  pdf: async () => (await import("./parsers/pdf")).parsePdf,
  docx: async () => (await import("./parsers/docx")).parseDocx,
};

const SUPPORTED_EXTS = Object.keys(PARSER_MAP);
const SUPPORTED_LABEL = SUPPORTED_EXTS.map((e) => `.${e}`).join(", ");

export function getSupportedExtensions(): string[] {
  return SUPPORTED_EXTS;
}

export function getSupportedLabel(): string {
  return SUPPORTED_LABEL;
}

/**
 * Parse a file into normalized plain text.
 * Automatically detects format from file extension.
 */
export async function parseFile(file: File): Promise<ParserOutput> {
  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  const loader = PARSER_MAP[ext];
  if (!loader) {
    throw new Error(
      `Unsupported file format: .${ext || "unknown"}. Supported: ${SUPPORTED_LABEL}`,
    );
  }

  const buffer = await file.arrayBuffer();
  const fn = await loader();
  return fn(buffer, fileName);
}
