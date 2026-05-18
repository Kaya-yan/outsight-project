import type { ParserFn } from "../types";

export const parseTxt: ParserFn = async (buffer, fileName) => {
  const decoder = new TextDecoder("utf-8");
  let plainText = decoder.decode(buffer);

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
