import type { ParserFn } from "../types";

export const parseMd: ParserFn = async (buffer, fileName) => {
  const decoder = new TextDecoder("utf-8");
  let text = decoder.decode(buffer);
  const warnings: string[] = [];

  // Strip YAML frontmatter if present
  if (text.startsWith("---")) {
    const end = text.indexOf("---", 3);
    if (end !== -1) {
      text = text.slice(end + 3).trim();
    }
  }

  // Strip common markdown syntax to get plain text
  text = text
    .replace(/^#{1,6}\s+/gm, "")        // headings
    .replace(/\*\*(.+?)\*\*/g, "$1")     // bold
    .replace(/__(.+?)__/g, "$1")         // bold alt
    .replace(/\*(.+?)\*/g, "$1")         // italic
    .replace(/_(.+?)_/g, "$1")           // italic alt
    .replace(/`{1,3}[^`]*`{1,3}/g, "")   // inline code & code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^>\s+/gm, "")              // blockquotes
    .replace(/^[-*+]\s+/gm, "")          // unordered lists
    .replace(/^\d+\.\s+/gm, "")          // ordered lists
    .replace(/^---+/gm, "")              // horizontal rules
    .replace(/\n{3,}/g, "\n\n")          // collapse whitespace
    .trim();

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  if (wordCount < 10) {
    warnings.push("Very little text extracted from markdown file");
  }

  return {
    plainText: text,
    wordCount,
    metadata: { title: fileName.replace(/\.[^.]+$/, "") },
    parserName: "markdown",
    warnings,
  };
};
