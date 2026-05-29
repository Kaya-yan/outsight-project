import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { cleanHtml, htmlToPlainText, cleanText } from "./text-cleaner";

export interface ExtractionResult {
  /** Cleaned HTML of the main article node */
  content: string | null;
  /** Plain text extracted from the article */
  fullText: string | null;
  /** Author from HTML meta or JSON-LD */
  author: string | null;
  /** ISO date string from HTML meta or JSON-LD */
  publishDate: string | null;
  /** Word count of fullText */
  wordCount: number | null;
  /** Error message if extraction failed */
  error?: string;
}

function extractMeta(doc: Document): { author: string | null; date: string | null } {
  let author: string | null = null;
  let date: string | null = null;

  // Author from meta tags
  const authorSelectors = [
    'meta[name="author"]',
    'meta[name="byl"]',
    'meta[property="article:author"]',
    'meta[property="og:author"]',
    'meta[name="sailthru.author"]',
    'meta[name="twitter:creator"]',
  ];
  for (const sel of authorSelectors) {
    const el = doc.querySelector(sel);
    const content = el?.getAttribute("content");
    if (content) { author = content.trim(); break; }
  }

  // Date from meta tags
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'meta[name="pubdate"]',
    'meta[name="publish-date"]',
    'meta[name="sailthru.date"]',
    'meta[property="og:article:published_time"]',
    'meta[name="DC.date.issued"]',
  ];
  for (const sel of dateSelectors) {
    const el = doc.querySelector(sel);
    const content = el?.getAttribute("content");
    if (content) { date = content.trim(); break; }
  }

  // Try JSON-LD for richer metadata
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const s of Array.from(scripts)) {
      const json = JSON.parse(s.textContent || "{}");
      const obj = Array.isArray(json) ? json[0] : json;
      if (!obj) continue;
      if (!author && obj.author?.name) author = obj.author.name;
      if (!author && typeof obj.author === "string") author = obj.author;
      if (!date && obj.datePublished) date = obj.datePublished;
      if (!date && obj.dateCreated) date = obj.dateCreated;
    }
  } catch { /* JSON-LD parse failure is non-fatal */ }

  return { author, date };
}

function formatDate(raw: string): string | null {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split("T")[0];
  } catch {
    return null;
  }
}

export async function extractContent(url: string, options?: {
  timeout?: number;
  maxBytes?: number;
}): Promise<ExtractionResult> {
  const timeout = options?.timeout ?? 15000;
  const maxBytes = options?.maxBytes ?? 2 * 1024 * 1024; // 2MB

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OutSight/1.0; Academic Research Tool; +https://outsight.app)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });

    if (!res.ok) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, error: `non-HTML content-type: ${contentType}` };
    }

    // Read response body
    let html = "";
    try {
      html = await res.text();
      if (html.length > maxBytes) {
        html = html.slice(0, maxBytes);
      }
    } catch {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, error: "failed to read response body" };
    }

    if (html.length < 200) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, error: "response too short" };
    }

    // Parse with JSDOM + Readability
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Remove noisy elements before Readability
    for (const tag of ["script", "style", "noscript", "iframe", "nav", "footer"]) {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    }

    const readability = new Readability(doc);
    const parsed = readability.parse();

    let content: string | null = null;
    let fullText: string | null = null;

    if (parsed) {
      // Clean HTML: remove social embeds, ad blocks
      content = cleanHtml(parsed.content ?? "");
      // Convert cleaned HTML to structured plain text
      fullText = htmlToPlainText(content);
    }

    // Fallback: if Readability gives nothing, use body text
    if (!fullText || fullText.length < 100) {
      fullText = (doc.body.textContent ?? "").replace(/\s{3,}/g, "\n\n").trim().slice(0, 50000);
    }

    if (!fullText || fullText.length < 50) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, error: "insufficient text extracted" };
    }

    // Final text cleaning: copyright truncation + whitespace normalization
    fullText = cleanText(fullText);

    const { author, date } = extractMeta(doc);
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      content: content ?? fullText,
      fullText,
      author: author ?? null,
      publishDate: date ? formatDate(date) : null,
      wordCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, error: msg };
  }
}
