import type { ParserOutput, ParserFn } from "./types";
import { parseTxt } from "./parsers/txt";
import { parseHtml } from "./parsers/html";
import { parseMd } from "./parsers/md";

// PDF and DOCX are lazy-loaded to avoid bundling native deps when unused
const PARSER_MAP: Record<string, ParserFn | (() => Promise<ParserFn>)> = {
  txt: parseTxt,
  html: parseHtml,
  htm: parseHtml,
  md: parseMd,
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

  const parser = PARSER_MAP[ext];
  if (!parser) {
    throw new Error(
      `Unsupported file format: .${ext || "unknown"}. Supported: ${SUPPORTED_LABEL}`,
    );
  }

  const buffer = await file.arrayBuffer();

  // Resolve lazy parser if needed
  const fn = typeof parser === "function" ? await parser() : parser;
  return fn(buffer, fileName);
}
