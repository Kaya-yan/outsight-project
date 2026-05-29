import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JSDOM } from "jsdom";
import { cleanHtml, htmlToPlainText, cleanText } from "@/lib/text-cleaner";
import { getAdapter, MEDIA_ADAPTERS } from "@/lib/domestic/media-adapters";

/**
 * POST /api/domestic/collect
 * Body: { mediaIds, dateFrom, dateTo, keywords?, sections?, minWordCount?,
 *         sourceType?, dedup, delayMs, autoAnalyze }
 *
 * SSE stream: emits progress events { phase, current, total, currentTitle, log }
 */

interface CollectBody {
  mediaIds: string[];
  dateFrom: string;
  dateTo: string;
  keywords?: string;
  minWordCount?: number;
  sourceType?: string;
  dedup: boolean;
  delayMs: number;
  autoAnalyze: boolean;
}

interface FoundArticle {
  title: string;
  url: string;
  date: string;
  mediaId: string;
  mediaName: string;
}

// ── Link extraction ──

async function fetchArticleLinks(
  listUrl: string,
  dateFrom: string,
  dateTo: string,
  pattern: RegExp,
): Promise<{ url: string; title: string }[]> {
  try {
    const res = await fetch(listUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
      redirect: "follow",
    });
    if (!res.ok) return [];

    const html = await res.text();
    const links: { url: string; title: string }[] = [];
    const seen = new Set<string>();

    // Extract all href links
    const hrefRegex = /href="(https?:\/\/[^"]+)"[^>]*>([^<]*)</gi;
    let match: RegExpExecArray | null;

    while ((match = hrefRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();

      if (!pattern.test(url)) continue;
      if (title.length < 3) continue;
      if (seen.has(url)) continue;

      // Date filter: extract date from URL and check range
      const urlDate = extractDateFromUrl(url);
      if (urlDate && (urlDate < dateFrom || urlDate > dateTo)) continue;

      seen.add(url);
      links.push({ url, title });
    }

    return links;
  } catch {
    return [];
  }
}

function extractDateFromUrl(url: string): string | null {
  // Try YYYY/MMDD pattern (people.com.cn style)
  const m1 = url.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;

  // Try YYYYMMDD pattern (ce.cn style)
  const m2 = url.match(/\/(\d{4})(\d{2})(\d{2})\//);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;

  return null;
}

// ── Content extraction ──

async function extractArticleContent(
  url: string,
  contentSelector: string,
  removeSelectors: string[],
): Promise<{ title: string; fullText: string; author: string | null; charCount: number; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!res.ok) return { title: "", fullText: "", author: null, charCount: 0, error: `HTTP ${res.status}` };

    const html = await res.text();
    if (html.length < 200) return { title: "", fullText: "", author: null, charCount: 0, error: "response too short" };

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Title
    let title = "";
    const titleEl = doc.querySelector("h1") || doc.querySelector(".title") || doc.querySelector("title");
    if (titleEl) {
      title = (titleEl.textContent?.trim() || "").replace(/\s*--.*$/, "");
    }

    // Remove unwanted elements (ads, nav, comments, etc.)
    for (const sel of removeSelectors) {
      try {
        doc.querySelectorAll(sel).forEach((el) => el.remove());
      } catch { /* invalid selector, skip */ }
    }

    // Content extraction
    let contentHtml = "";
    // Try multiple selectors (split by comma for fallback chain)
    const selectors = contentSelector.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && (el.textContent?.trim().length || 0) > 50) {
        contentHtml = el.innerHTML;
        break;
      }
    }

    // Fallback: collect all <p> tags
    if (!contentHtml) {
      const paragraphs = doc.body?.querySelectorAll("p");
      if (paragraphs && paragraphs.length > 2) {
        contentHtml = Array.from(paragraphs).map((p) => `<p>${p.innerHTML}</p>`).join("");
      }
    }

    if (!contentHtml) return { title, fullText: "", author: null, charCount: 0, error: "no content found" };

    // Clean
    const cleanedHtml = cleanHtml(contentHtml);
    let fullText = htmlToPlainText(cleanedHtml);
    fullText = cleanText(fullText);

    if (fullText.length < 30) return { title, fullText: "", author: null, charCount: 0, error: "text too short" };

    // Author
    let author: string | null = null;
    const authorEl = doc.querySelector(".author") || doc.querySelector("[class*='editor']") || doc.querySelector(".source");
    if (authorEl) {
      author = (authorEl.textContent?.trim() || "")
        .replace(/责任编辑[:：]?\s*/g, "")
        .replace(/来源[:：]?\s*/g, "")
        .trim() || null;
    }

    const charCount = fullText.replace(/\s/g, "").length;
    return { title, fullText, author, charCount };
  } catch (err) {
    return { title: "", fullText: "", author: null, charCount: 0, error: err instanceof Error ? err.message : "unknown" };
  }
}

// ── SHA-256 ──

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Title similarity (Jaccard on character bigrams) ──

function titleSimilarity(a: string, b: string): number {
  const bigrams = (s: string) => {
    const set = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
    return set;
  };
  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const bg of setA) if (setB.has(bg)) intersection++;
  return intersection / (setA.size + setB.size - intersection);
}

// ── SSE Helper ──

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ── Main handler ──

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: CollectBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const { mediaIds, dateFrom, dateTo, keywords, minWordCount, dedup, delayMs, autoAnalyze } = body;

  if (!mediaIds?.length || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const delay = Math.max(1000, Math.min(5000, delayMs || 1500));

  // SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      try {
        // Phase 1: Collect article links from all selected media
        send({ phase: "fetching", log: "开始扫描媒体源..." });

        const allLinks: FoundArticle[] = [];

        for (const mediaId of mediaIds) {
          const adapter = getAdapter(mediaId);
          if (!adapter) {
            send({ log: `未找到适配器: ${mediaId}` });
            continue;
          }

          send({ log: `扫描 ${adapter.name} (${adapter.listPages.length} 个页面)` });

          for (const pageUrl of adapter.listPages) {
            const links = await fetchArticleLinks(pageUrl, dateFrom, dateTo, adapter.articlePattern);
            for (const link of links) {
              // Keyword filter
              if (keywords && !link.title.includes(keywords) && !link.url.includes(keywords)) continue;
              allLinks.push({
                title: link.title,
                url: link.url,
                date: extractDateFromUrl(link.url) || dateFrom,
                mediaId: adapter.id,
                mediaName: adapter.name,
              });
            }
            send({ log: `  ${pageUrl} → ${links.length} 篇` });
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        send({ log: `共发现 ${allLinks.length} 篇文章`, total: allLinks.length });

        if (allLinks.length === 0) {
          send({ phase: "done", log: "未找到符合条件的文章" });
          controller.close();
          return;
        }

        // Phase 2: Collect content for each article
        send({ phase: "collecting", current: 0, total: allLinks.length });

        let collected = 0;
        let skipped = 0;
        let failed = 0;

        // Fetch existing URLs and titles for dedup
        const existingUrls = new Set<string>();
        const existingTitles: string[] = [];
        if (dedup) {
          const { data: existing } = await supabase
            .from("articles")
            .select("url, title")
            .eq("source", "domestic_media")
            .limit(2000);
          if (existing) {
            for (const e of existing) {
              existingUrls.add(e.url);
              existingTitles.push(e.title);
            }
          }
        }

        for (let i = 0; i < allLinks.length; i++) {
          const article = allLinks[i];
          send({ current: i + 1, total: allLinks.length, currentTitle: article.title.slice(0, 40) });

          // URL dedup
          if (dedup && existingUrls.has(article.url)) {
            send({ log: `跳过 (URL重复): ${article.title.slice(0, 30)}` });
            skipped++;
            continue;
          }

          // Title similarity dedup
          if (dedup) {
            const isDuplicate = existingTitles.some((t) => titleSimilarity(t, article.title) > 0.85);
            if (isDuplicate) {
              send({ log: `跳过 (标题相似): ${article.title.slice(0, 30)}` });
              skipped++;
              continue;
            }
          }

          // URL hash dedup
          const urlHash = await sha256(article.url);
          const { data: hashExists } = await supabase
            .from("articles")
            .select("id")
            .eq("url_hash", urlHash)
            .maybeSingle();

          if (hashExists) {
            send({ log: `跳过 (hash重复): ${article.title.slice(0, 30)}` });
            skipped++;
            continue;
          }

          // Extract content
          const adapter = getAdapter(article.mediaId)!;
          const extracted = await extractArticleContent(
            article.url,
            adapter.contentSelector,
            adapter.removeSelectors,
          );

          if (!extracted.fullText || extracted.fullText.length < 30) {
            send({ log: `失败: ${article.title.slice(0, 30)} — ${extracted.error || "无内容"}` });
            failed++;
            continue;
          }

          // Word count filter
          if (minWordCount && extracted.charCount < minWordCount) {
            send({ log: `跳过 (字数不足 ${extracted.charCount}): ${article.title.slice(0, 30)}` });
            skipped++;
            continue;
          }

          // Insert
          const insertData = {
            title: extracted.title || article.title,
            url: article.url,
            url_hash: urlHash,
            source: "domestic_media",
            media: article.mediaName,
            source_type: adapter.sourceType,
            language: "zh" as const,
            publish_date: article.date,
            full_text: extracted.fullText,
            full_text_status: "complete" as const,
            word_count: extracted.charCount,
            status: "已入库" as const,
            author: extracted.author,
            metadata: {
              char_count: extracted.charCount,
              collected_at: new Date().toISOString(),
              media_id: article.mediaId,
              collection_source: "domestic_panel",
            },
          };

          const { data: inserted, error: insertErr } = await supabase
            .from("articles")
            .insert(insertData)
            .select("id")
            .single();

          if (insertErr) {
            send({ log: `入库失败: ${article.title.slice(0, 30)} — ${insertErr.message}` });
            failed++;
            continue;
          }

          // Track for dedup
          existingUrls.add(article.url);
          existingTitles.push(article.title);

          collected++;
          send({ log: `✓ ${article.title.slice(0, 40)} (${extracted.charCount}字)` });

          // Auto-analyze
          if (autoAnalyze && inserted) {
            try {
              const { runDomesticAiPipeline } = await import("@/lib/domestic/ai-dimensions");
              const analysis = await runDomesticAiPipeline(extracted.fullText);
              const meta = { domestic_ai_analysis: analysis };
              await supabase.from("articles").update({ metadata: meta }).eq("id", inserted.id);
              send({ log: `  AI分析完成` });
            } catch {
              send({ log: `  AI分析失败` });
            }
          }

          // Delay between requests
          await new Promise((r) => setTimeout(r, delay));
        }

        send({
          phase: "done",
          log: `采集完成: 成功=${collected}, 跳过=${skipped}, 失败=${failed}`,
        });
      } catch (err) {
        send({ phase: "error", log: `严重错误: ${err instanceof Error ? err.message : "unknown"}` });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
