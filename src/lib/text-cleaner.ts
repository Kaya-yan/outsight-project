/**
 * Post-extraction text cleaning — runs after Readability, before DB write.
 *
 * Two entry points:
 *   cleanHtml(html)  → cleaned HTML (social embeds & ad blocks removed)
 *   cleanText(text)  → cleaned plain text (copyright truncated, whitespace normalized)
 */

import { JSDOM } from "jsdom";

// ── Ad / navigation blacklist ──
const AD_KEYWORDS = [
  // English
  "advertisement",
  "related stories",
  "related articles",
  "more from",
  "more on",
  "follow us",
  "sign up for",
  "sign up to",
  "read more",
  "editors' picks",
  "editor's picks",
  "sponsored",
  "promotion",
  "most popular",
  "trending now",
  "recommended for you",
  "you may also like",
  "subscribe now",
  "newsletter",
  "download the app",
  "get the app",
  "podcast",
  "breaking news alerts",
  "top stories",
  "latest stories",
  "continue reading",
  "share this article",
  "share this story",
  "was this article helpful",
  "loading...",
  // Chinese
  "广告",
  "相关阅读",
  "推荐阅读",
  "关注我们",
  "订阅",
  "热门推荐",
  "猜你喜欢",
  "展开全文",
  "点击关注",
  "阅读更多",
  "下载客户端",
  "责任编辑",
  "来源：",
  "本文来源",
];

// ── Social media embed class names ──
const SOCIAL_EMBED_CLASSES = [
  "twitter-tweet",
  "instagram-media",
  "fb-post",
  "fb-video",
  "tiktok-embed",
  "reddit-embed",
  "youtube-embed",
  "social-embed",
  "social-media-embed",
  "tweet-embed",
  "instagram-embed",
];

// ── Copyright / byline patterns for tail truncation ──
const COPYRIGHT_PATTERNS = [
  /©\s*\d{4}/i,
  /\bAll\s+rights\s+reserved\b/i,
  /\bCopyright\s*[©(]?\s*\d{4}/i,
  /\b(?:distributed|published)\s+by\s+.+/i,
  /\bAP\s+news\b/i,
  /\bReuters\b/i,
  /\bAFP\b/i,
  /\b(?:This\s+article\s+was\s+)?(?:originally\s+)?published\s+(?:in|by|on)\b/i,
  /\bDow\s+Jones\s+Newswires?\b/i,
];

// Block-level tags that should produce line breaks
const BLOCK_TAGS = new Set([
  "P", "DIV", "SECTION", "ARTICLE", "HEADER", "FOOTER",
  "H1", "H2", "H3", "H4", "H5", "H6",
  "BLOCKQUOTE", "LI", "TR", "DT", "DD",
  "FIGCAPTION", "FIGURE", "ADDRESS",
]);

/**
 * Remove social media embeds and ad/navigation blocks from HTML.
 * Returns cleaned HTML string.
 */
export function cleanHtml(html: string): string {
  if (!html || html.length < 50) return html;

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // 1. Remove social media embeds by class name
  for (const cls of SOCIAL_EMBED_CLASSES) {
    doc.querySelectorAll(`[class*="${cls}"]`).forEach((el) => el.remove());
  }

  // 2. Remove ad/navigation blocks by keyword content
  const adKeywordsLower = AD_KEYWORDS.map((k) => k.toLowerCase());
  const blockElements = doc.querySelectorAll(
    "p, div, section, aside, nav, footer, header, figure, blockquote, ul, ol"
  );

  blockElements.forEach((el) => {
    const text = (el.textContent ?? "").trim().toLowerCase();
    if (text.length < 5) return; // skip tiny nodes

    // If the entire block text matches a blacklisted keyword phrase, remove it
    for (const kw of adKeywordsLower) {
      // Match if the block is dominated by the keyword (short block + keyword present)
      if (text.length < 200 && text.includes(kw)) {
        el.remove();
        return;
      }
    }
  });

  // 3. Remove empty/divider-only elements
  doc.querySelectorAll("hr, br + br + br").forEach((el) => el.remove());

  return doc.body.innerHTML;
}

/**
 * Convert HTML to structured plain text, preserving paragraph breaks.
 * <p> → double newline, <br> → single newline, block elements → double newline.
 */
export function htmlToPlainText(html: string): string {
  if (!html || html.length < 50) return html;

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  function walk(node: globalThis.Node): string {
    if (node.nodeType === 3) {
      // Text node
      return (node.textContent ?? "");
    }

    if (node.nodeType !== 1) return "";

    const el = node as globalThis.Element;
    const tag = el.tagName;

    // Skip hidden/script/style
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return "";

    // <br> → single newline
    if (tag === "BR") return "\n";

    // Block elements → content + double newline
    const isBlock = BLOCK_TAGS.has(tag);
    let inner = "";
    for (const child of Array.from(el.childNodes)) {
      inner += walk(child);
    }

    if (isBlock) {
      return inner.trim() + "\n\n";
    }
    return inner;
  }

  let text = walk(doc.body);

  // Clean up: collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/**
 * Strip ALL HTML tags and decode entities. Use as final safety net on any text
 * that might still contain residual HTML.
 */
export function stripHtmlTags(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Remove script/style blocks entirely (including content)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");

  // Remove all remaining HTML tags (self-closing, with attributes, etc.)
  cleaned = cleaned.replace(/<\/?[a-zA-Z][^>]*\/?>/g, "");
  // Also catch malformed tags like </a > or < br/ >
  cleaned = cleaned.replace(/<\/?\s*[a-zA-Z][^>]*>/g, "");

  // Decode common HTML entities
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
    "&ensp;": " ",
    "&emsp;": " ",
    "&thinsp;": " ",
    "&hellip;": "…",
    "&mdash;": "—",
    "&ndash;": "–",
    "&lsquo;": "‘",
    "&rsquo;": "’",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&bull;": "•",
    "&middot;": "·",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
  };
  for (const [entity, char] of Object.entries(entities)) {
    cleaned = cleaned.replaceAll(entity, char);
  }
  // Numeric entities: &#123; and &#x1F;
  cleaned = cleaned.replace(/&#(\d+);/g, (_, code) => {
    try { return String.fromCodePoint(parseInt(code, 10)); } catch { return ""; }
  });
  cleaned = cleaned.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => {
    try { return String.fromCodePoint(parseInt(code, 16)); } catch { return ""; }
  });

  // Clean up residual attribute-like fragments that leaked through
  cleaned = cleaned.replace(/\b(data-[a-z-]+|class|id|style|href|src|alt|title|role|aria-[a-z-]+)\s*=\s*"[^"]*"/gi, "");

  // Collapse whitespace
  cleaned = cleaned.replace(/[ \t]+/g, " ");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * Clean plain text: copyright truncation + whitespace normalization.
 */
export function cleanText(text: string): string {
  if (!text || text.length < 50) return text;

  let cleaned = text;

  // 1. Truncate copyright / byline at tail
  const lines = cleaned.split("\n");
  let cutIndex = lines.length;

  // Scan from bottom, find first copyright-like line
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 6); i--) {
    const line = lines[i].trim();
    for (const pattern of COPYRIGHT_PATTERNS) {
      if (pattern.test(line)) {
        cutIndex = i;
        break;
      }
    }
    if (cutIndex < lines.length) break;
  }

  // Also remove trailing very short lines that look like bylines
  // (e.g., "— John Smith, The New York Times" or "By Jane Doe")
  while (cutIndex > 0) {
    const tail = lines[cutIndex - 1].trim();
    if (
      tail.length < 80 &&
      (/^—\s*\w/.test(tail) || /^–\s*\w/.test(tail) || /^By\s+[A-Z]/.test(tail))
    ) {
      cutIndex--;
    } else {
      break;
    }
  }

  if (cutIndex < lines.length) {
    cleaned = lines.slice(0, cutIndex).join("\n");
  }

  // 2. Whitespace normalization
  // Full-width space → half-width
  cleaned = cleaned.replace(/　/g, " ");

  // Trim each line
  cleaned = cleaned
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n");

  // Collapse 3+ consecutive newlines → 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // Collapse multiple spaces → single (preserve leading indent already trimmed)
  cleaned = cleaned.replace(/ {2,}/g, " ");

  return cleaned.trim();
}
