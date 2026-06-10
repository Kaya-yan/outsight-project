import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { cleanHtml, htmlToPlainText, cleanText, stripHtmlTags } from "./text-cleaner";

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
  /** Which extraction strategy produced the result */
  extractionStrategy: string;
  /** Error message if extraction failed */
  error?: string;
}

/** Firecrawl API base — requires FIRECRAWL_API_KEY env var */
const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

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
          "Mozilla/5.0 (compatible; OutSight/2.0; Academic Research Tool; +https://outsight.app)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });

    if (!res.ok) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, extractionStrategy: "none", error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, extractionStrategy: "none", error: `non-HTML content-type: ${contentType}` };
    }

    // Read response body
    let html = "";
    try {
      html = await res.text();
      if (html.length > maxBytes) {
        html = html.slice(0, maxBytes);
      }
    } catch {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, extractionStrategy: "none", error: "failed to read response body" };
    }

    if (html.length < 200) {
      return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, extractionStrategy: "none", error: "response too short" };
    }

    // Parse with JSDOM
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // ── Strategy 1: Readability ──
    const readabilityResult = tryReadability(doc, url);
    if (readabilityResult) {
      return readabilityResult;
    }

    // ── Strategy 2: JSON-LD articleBody ──
    const jsonLdResult = tryJsonLdArticleBody(doc, url);
    if (jsonLdResult) {
      return jsonLdResult;
    }

    // ── Strategy 3: Firecrawl API (requires FIRECRAWL_API_KEY) ──
    const firecrawlResult = await tryFirecrawl(url);
    if (firecrawlResult) {
      return firecrawlResult;
    }

    // ── Strategy 4: Jina AI Reader (external service) ──
    const jinaResult = await tryJinaReader(url);
    if (jinaResult) {
      return jinaResult;
    }

    // ── Strategy 5: Archive.today fallback ──
    const archiveResult = await tryArchiveToday(url);
    if (archiveResult) {
      return archiveResult;
    }

    // ── All strategies failed ──
    return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, extractionStrategy: "none", error: "all extraction strategies failed" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { content: null, fullText: null, author: null, publishDate: null, wordCount: null, extractionStrategy: "none", error: msg };
  }
}

// ── Strategy implementations ──

const FAILED_RESULT = null; // sentinel for "try next strategy"

function tryReadability(doc: Document, url: string): ExtractionResult | null {
  // Clone doc to avoid mutation issues with subsequent strategies
  const clone = doc.cloneNode(true) as Document;
  for (const tag of ["script", "style", "noscript", "iframe", "nav", "footer"]) {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  }

  const readability = new Readability(clone);
  const parsed = readability.parse();

  if (!parsed) return FAILED_RESULT;

  let content = cleanHtml(parsed.content ?? "");
  let fullText = htmlToPlainText(content);

  if (!fullText || fullText.length < 100) return FAILED_RESULT;

  fullText = cleanText(stripHtmlTags(fullText));

  const { author, date } = extractMeta(doc);
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return {
    content,
    fullText,
    author: author ?? null,
    publishDate: date ? formatDate(date) : null,
    wordCount,
    extractionStrategy: "readability",
  };
}

function tryJsonLdArticleBody(doc: Document, url: string): ExtractionResult | null {
  try {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const s of Array.from(scripts)) {
      const json = JSON.parse(s.textContent || "{}");
      const items: Record<string, unknown>[] = Array.isArray(json) ? json : [json];

      for (const obj of items) {
        if (!obj || typeof obj !== "object") continue;
        const articleBody = obj.articleBody;
        if (typeof articleBody === "string" && articleBody.length >= 100) {
          const fullText = cleanText(stripHtmlTags(articleBody));
          if (fullText.length < 50) continue;

          const author = typeof obj.author === "string"
            ? obj.author
            : (obj.author as Record<string, unknown>)?.name as string | undefined ?? null;
          const date = (obj.datePublished ?? obj.dateCreated) as string | undefined ?? null;
          const wordCount = fullText.split(/\s+/).filter(Boolean).length;

          return {
            content: null,
            fullText,
            author,
            publishDate: date ? formatDate(date) : null,
            wordCount,
            extractionStrategy: "json-ld",
          };
        }
      }
    }
  } catch { /* JSON-LD parse failure is non-fatal */ }
  return FAILED_RESULT;
}

async function tryFirecrawl(url: string): Promise<ExtractionResult | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return FAILED_RESULT;

  try {
    const res = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url,
        params: {
          onlyMainContent: true,
          formats: ["markdown"],
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) return FAILED_RESULT;

    const json = await res.json() as Record<string, unknown>;
    const data = json.data as Record<string, unknown> | undefined;
    if (!data?.markdown) return FAILED_RESULT;

    const markdown = data.markdown as string;
    if (markdown.length < 100) return FAILED_RESULT;

    const fullText = cleanText(stripHtmlTags(markdown));
    if (fullText.length < 50) return FAILED_RESULT;

    // Extract metadata if available
    const metadata = data.metadata as Record<string, unknown> | undefined;
    const author = (metadata?.author as string) ?? null;
    const publishDate = metadata?.publishedTime
      ? formatDate(metadata.publishedTime as string)
      : null;
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      content: null,
      fullText,
      author,
      publishDate,
      wordCount,
      extractionStrategy: "firecrawl",
    };
  } catch {
    return FAILED_RESULT;
  }
}

/** Retry wrapper with exponential backoff (data-pipeline pattern) */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  baseDelayMs = 1000,
): Promise<T | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch {
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
      }
    }
  }
  return null;
}

async function tryJinaReader(url: string): Promise<ExtractionResult | null> {
  const result = await withRetry(async () => {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/plain",
        "User-Agent": "OutSight/2.0 (Academic Research Tool)",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const text = await res.text();
    if (!text || text.length < 100) return null;

    const fullText = cleanText(stripHtmlTags(text));
    if (fullText.length < 50) return null;

    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      content: null,
      fullText,
      author: null,
      publishDate: null,
      wordCount,
      extractionStrategy: "jina",
    } as ExtractionResult;
  });

  return result ?? FAILED_RESULT;
}

async function tryArchiveToday(url: string): Promise<ExtractionResult | null> {
  const result = await withRetry(async () => {
    const archiveUrl = `https://archive.ph/newest/${url}`;
    const res = await fetch(archiveUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; OutSight/2.0; Academic Research Tool)",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });

    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 500) return null;

    const dom = new JSDOM(html, { url: archiveUrl });
    const doc = dom.window.document;

    for (const tag of ["script", "style", "noscript", "iframe", "nav", "footer"]) {
      doc.querySelectorAll(tag).forEach((el) => el.remove());
    }

    const readability = new Readability(doc);
    const parsed = readability.parse();

    if (!parsed) return null;

    let content = cleanHtml(parsed.content ?? "");
    let fullText = htmlToPlainText(content);

    if (!fullText || fullText.length < 100) return null;

    fullText = cleanText(stripHtmlTags(fullText));

    const { author, date } = extractMeta(doc);
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      content,
      fullText,
      author: author ?? null,
      publishDate: date ? formatDate(date) : null,
      wordCount,
      extractionStrategy: "archive",
    } as ExtractionResult;
  });

  return result ?? FAILED_RESULT;
}
