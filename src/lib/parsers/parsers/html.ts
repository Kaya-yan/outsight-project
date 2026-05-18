import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { ParserFn } from "../types";

export const parseHtml: ParserFn = async (buffer, fileName) => {
  const decoder = new TextDecoder("utf-8");
  const html = decoder.decode(buffer);

  return extractFromHtml(html, fileName);
};

/** Shared HTML extraction — also used by crawl pipeline */
export function extractFromHtml(html: string, sourceName = "html") {
  const warnings: string[] = [];

  if (html.length < 100) {
    return {
      plainText: html.trim(),
      wordCount: html.split(/\s+/).filter(Boolean).length,
      metadata: {},
      parserName: "html",
      warnings: ["HTML content is very short"],
    };
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract meta
  const title = doc.querySelector("title")?.textContent?.trim();
  let author: string | undefined;
  let date: string | undefined;

  const authorEl = doc.querySelector('meta[name="author"], meta[property="article:author"]');
  if (authorEl) author = authorEl.getAttribute("content")?.trim() || undefined;

  const dateEl = doc.querySelector('meta[property="article:published_time"], meta[name="date"]');
  if (dateEl) date = dateEl.getAttribute("content")?.trim() || undefined;

  // Remove noisy tags
  for (const tag of ["script", "style", "noscript", "iframe", "nav", "footer", "svg"]) {
    doc.querySelectorAll(tag).forEach((el) => el.remove());
  }

  // Try Readability
  let plainText = "";
  try {
    const reader = new Readability(doc);
    const parsed = reader.parse();
    if (parsed?.content) {
      const textDom = new JSDOM(parsed.content);
      plainText = (textDom.window.document.body.textContent ?? "")
        .replace(/\s{3,}/g, "\n\n")
        .trim();
    }
  } catch {
    warnings.push("Readability parse failed, falling back to body text");
  }

  // Fallback: body textContent
  if (!plainText || plainText.length < 100) {
    plainText = (doc.body.textContent ?? "")
      .replace(/\s{3,}/g, "\n\n")
      .trim()
      .slice(0, 50000);
    if (plainText.length < 100) {
      warnings.push("Very little text extracted from HTML");
    }
  }

  const wordCount = plainText.split(/\s+/).filter(Boolean).length;

  return {
    plainText,
    wordCount,
    metadata: { title: title || sourceName, author, date },
    parserName: "html",
    warnings,
  };
}
