import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JSDOM } from "jsdom";
import { cleanHtml, htmlToPlainText, cleanText, stripHtmlTags } from "@/lib/text-cleaner";
import { getAdapter } from "@/lib/domestic/media-adapters";
import { hashUrl } from "@/lib/dedup";

/**
 * POST /api/domestic/collect
 * Body: { mediaIds, dateFrom, dateTo, keywords?, minWordCount? }
 *
 * Dedup is always enabled. Delay is fixed at 1200ms. No auto-analyze.
 * SSE stream: emits progress events with granular status, error list, and summary.
 */

interface CollectBody {
  mediaIds: string[];
  dateFrom: string;
  dateTo: string;
  keywords?: string;
  minWordCount?: number;
}

interface FoundArticle {
  title: string;
  url: string;
  date: string;
  mediaId: string;
  mediaName: string;
}

const DELAY_MS = 1200;

const DEFAULT_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
        "User-Agent": DEFAULT_UA,
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

    const hrefRegex = /href="(https?:\/\/[^"]+)"[^>]*>([^<]*)</gi;
    let match: RegExpExecArray | null;

    while ((match = hrefRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].trim();

      if (!pattern.test(url)) continue;
      if (title.length < 3) continue;
      if (seen.has(url)) continue;

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
  const m1 = url.match(/\/(\d{4})\/(\d{2})(\d{2})\//);
  if (m1) return `${m1[1]}-${m1[2]}-${m1[3]}`;
  const m2 = url.match(/\/(\d{4})(\d{2})(\d{2})\//);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

// ── Content extraction (academic boilerplate removal) ──

/** Title blacklist — if title matches, reject and fall through to next priority */
const TITLE_BLACKLIST = /导航|首页|栏目|频道|返回|网站地图|站点地图|全部分类|登录|注册/;

/** Noise keyword blacklist for paragraph-level filtering */
const NOISE_KEYWORDS = [
  // Share buttons
  "点击右上角", "微信好友", "朋友圈", "请使用浏览器分享", "分享功能", "发送给朋友",
  "分享到微博", "分享到QQ", "复制链接", "扫一扫",
  // Navigation
  "全部导航", "网站地图", "面包屑", "返回首页", "上一页", "下一页",
  // Recommendations
  "推荐阅读", "相关文章", "热门推荐", "猜你喜欢", "延伸阅读", "相关推荐",
  "更多文章", "精彩推荐", "大家都在看", "热门搜索",
  // Templates
  "版权所有", "免责声明", "关于我们", "联系我们", "广告服务", "投稿邮箱",
  "互联网新闻信息服务许可证", "广播电视节目制作经营许可证",
  // Special topics
  "专题推荐", "国家公祭日", "全民国家安全教育日",
];

/**
 * Extract title with priority-based fallback + blacklist filtering.
 * Priority: h1 > og:title > meta:title > title (cleaned) > first paragraph
 */
function extractTitle(doc: Document): string {
  // P1: <h1> tag (most reliable for article pages)
  const h1 = doc.querySelector("h1");
  if (h1) {
    const text = (h1.textContent ?? "").trim();
    if (text.length >= 4 && text.length <= 200 && !TITLE_BLACKLIST.test(text)) {
      return text;
    }
  }

  // P2: og:title meta tag
  const ogTitle = doc.querySelector('meta[property="og:title"]');
  if (ogTitle) {
    const text = (ogTitle.getAttribute("content") ?? "").trim();
    if (text.length >= 4 && text.length <= 200 && !TITLE_BLACKLIST.test(text)) {
      return text;
    }
  }

  // P3: meta name="title"
  const metaTitle = doc.querySelector('meta[name="title"]');
  if (metaTitle) {
    const text = (metaTitle.getAttribute("content") ?? "").trim();
    if (text.length >= 4 && text.length <= 200 && !TITLE_BLACKLIST.test(text)) {
      return text;
    }
  }

  // P4: <title> tag (strip site suffix like " - 人民日报")
  const titleEl = doc.querySelector("title");
  if (titleEl) {
    let text = (titleEl.textContent ?? "").trim();
    text = text.replace(/\s*[-_|—]\s*[^-_|—]{2,30}$/, "").trim(); // strip suffix
    if (text.length >= 4 && text.length <= 200 && !TITLE_BLACKLIST.test(text)) {
      return text;
    }
  }

  // P5: First meaningful <p> content (first 30 chars)
  const firstP = doc.querySelector("article p, .content p, .article p, main p");
  if (firstP) {
    const text = (firstP.textContent ?? "").trim();
    if (text.length >= 10) return text.slice(0, 30) + "...";
  }

  return "";
}

/**
 * Calculate text density of a DOM node (Kohlschütter 2010).
 * textDensity = pureTextChars / htmlTags
 * High density (>10) = likely content; low density (<5) = likely boilerplate.
 */
function textDensity(el: Element): number {
  const text = (el.textContent ?? "").trim();
  if (text.length === 0) return 0;
  const html = el.innerHTML;
  const tagCount = (html.match(/<[a-zA-Z][^>]*>/g) ?? []).length;
  return tagCount === 0 ? text.length : text.length / tagCount;
}

/**
 * Calculate link density of a DOM node (Trafilatura 2021).
 * linkDensity = anchorTextChars / totalTextChars
 * High density (>0.3) = navigation/recommendation list.
 */
function linkDensity(el: Element): number {
  const totalText = (el.textContent ?? "").trim();
  if (totalText.length === 0) return 0;
  let anchorText = 0;
  el.querySelectorAll("a").forEach((a) => {
    anchorText += (a.textContent ?? "").trim().length;
  });
  return anchorText / totalText.length;
}

/**
 * Check if a paragraph contains noise keywords.
 */
function isNoiseParagraph(text: string): boolean {
  for (const kw of NOISE_KEYWORDS) {
    if (text.includes(kw)) return true;
  }
  return false;
}

async function extractArticleContent(
  url: string,
  contentSelector: string,
  removeSelectors: string[],
): Promise<{ title: string; fullText: string; author: string | null; charCount: number; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "zh-CN,zh;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    if (!res.ok) return { title: "", fullText: "", author: null, charCount: 0, error: `HTTP ${res.status}` };

    const html = await res.text();
    if (html.length < 200) return { title: "", fullText: "", author: null, charCount: 0, error: "响应内容过短" };

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // ── Title extraction (priority + blacklist) ──
    const title = extractTitle(doc);

    // ── Pre-clean: remove known noise elements ──
    const noiseSelectors = [
      "nav", "header", "footer", "aside",
      ".breadcrumb", ".breadcrumbs", ".nav", ".navigation", ".menu",
      ".share", ".sharing", ".social", ".print", ".bookmark",
      ".related", ".recommend", ".sidebar", ".widget", ".ad", ".advertisement",
      ".comment", ".comments", "#comments",
      ".copyright", ".disclaimer",
      ...removeSelectors,
    ];
    for (const sel of noiseSelectors) {
      try { doc.querySelectorAll(sel).forEach((el) => el.remove()); } catch { /* skip */ }
    }

    // ── Content extraction ──
    let contentHtml = "";

    // Strategy 1: Use adapter's contentSelector
    const selectors = contentSelector.split(",").map((s) => s.trim());
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && (el.textContent?.trim().length || 0) > 50) {
        contentHtml = el.innerHTML;
        break;
      }
    }

    // Strategy 2: Try semantic containers
    if (!contentHtml) {
      const semanticSelectors = ["article", "main", '[role="main"]', ".article-content", ".post-content", ".entry-content", "#content"];
      for (const sel of semanticSelectors) {
        const el = doc.querySelector(sel);
        if (el && (el.textContent?.trim().length || 0) > 100) {
          contentHtml = el.innerHTML;
          break;
        }
      }
    }

    // Strategy 3: Paragraph collection with density filtering (Sun 2011)
    if (!contentHtml) {
      const allPs = doc.body?.querySelectorAll("p");
      if (allPs && allPs.length > 2) {
        const goodPs: string[] = [];
        for (const p of Array.from(allPs)) {
          const text = (p.textContent ?? "").trim();
          // Filter short paragraphs and noise
          if (text.length < 20) continue;
          if (isNoiseParagraph(text)) continue;
          // Filter high link-density paragraphs (navigation/recommendations)
          if (linkDensity(p) > 0.3) continue;
          // Filter low text-density paragraphs (buttons, labels)
          if (textDensity(p) < 3 && text.length < 60) continue;
          goodPs.push(`<p>${p.innerHTML}</p>`);
        }
        if (goodPs.length > 0) contentHtml = goodPs.join("");
      }
    }

    if (!contentHtml) return { title, fullText: "", author: null, charCount: 0, error: "正文提取为空" };

    // ── Clean and convert ──
    const cleanedHtml = cleanHtml(contentHtml);
    let fullText = htmlToPlainText(cleanedHtml);

    // ── Paragraph-level noise filtering on plain text ──
    const paragraphs = fullText.split(/\n\n+/);
    const filteredParagraphs = paragraphs.filter((p) => {
      const trimmed = p.trim();
      if (trimmed.length < 15) return false;
      if (isNoiseParagraph(trimmed)) return false;
      return true;
    });
    fullText = filteredParagraphs.join("\n\n");

    fullText = cleanText(fullText);
    fullText = stripHtmlTags(fullText);

    if (fullText.length < 30) return { title, fullText: "", author: null, charCount: 0, error: "清洗后文本过短" };

    // ── Author extraction ──
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
    return { title: "", fullText: "", author: null, charCount: 0, error: err instanceof Error ? err.message : "未知错误" };
  }
}

// ── Helpers ──

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
  for (const bg of Array.from(setA)) if (setB.has(bg)) intersection++;
  return intersection / (setA.size + setB.size - intersection);
}

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

  const { mediaIds, dateFrom, dateTo, keywords, minWordCount } = body;

  if (!mediaIds?.length || !dateFrom || !dateTo) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      const startTime = Date.now();

      try {
        // Phase 1: Scan media sources for article links
        send({ phase: "fetching", log: "开始扫描媒体源..." });

        const allLinks: FoundArticle[] = [];

        for (const mediaId of mediaIds) {
          const adapter = getAdapter(mediaId);
          if (!adapter) {
            send({ log: `未找到适配器: ${mediaId}` });
            continue;
          }

          send({ log: `正在解析 ${adapter.name} (${adapter.listPages.length} 个列表页)` });

          for (const pageUrl of adapter.listPages) {
            send({ log: `  请求: ${pageUrl}` });
            const links = await fetchArticleLinks(pageUrl, dateFrom, dateTo, adapter.articlePattern);
            for (const link of links) {
              if (keywords && !link.title.includes(keywords) && !link.url.includes(keywords)) continue;
              allLinks.push({
                title: link.title,
                url: link.url,
                date: extractDateFromUrl(link.url) || dateFrom,
                mediaId: adapter.id,
                mediaName: adapter.name,
              });
            }
            send({ log: `  → 发现 ${links.length} 篇匹配文章` });
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        send({ log: `扫描完成，共发现 ${allLinks.length} 篇文章`, total: allLinks.length });

        if (allLinks.length === 0) {
          send({ phase: "done", log: "未找到符合条件的文章", summary: { collected: 0, skipped: 0, failed: 0 } });
          controller.close();
          return;
        }

        // Phase 2: Collect content
        send({ phase: "collecting", current: 0, total: allLinks.length });

        let collected = 0;
        let skipped = 0;
        let failed = 0;

        // Pre-fetch existing data for dedup (URLs, titles, and hashes)
        send({ log: "加载已有数据用于去重..." });
        const existingUrls = new Set<string>();
        const existingTitles: string[] = [];
        const existingHashes = new Set<string>();
        const { data: existing } = await supabase
          .from("articles")
          .select("url, title, url_hash")
          .eq("source", "domestic_media")
          .limit(2000);
        if (existing) {
          for (const e of existing) {
            existingUrls.add(e.url);
            existingTitles.push(e.title);
            if (e.url_hash) existingHashes.add(e.url_hash);
          }
        }
        send({
          log: existingUrls.size >= 2000
            ? `已加载 ${existingUrls.size} 条去重记录（已达上限，部分旧文章可能未纳入去重）`
            : `已加载 ${existingUrls.size} 条去重记录`,
        });

        // Track skip reasons for summary
        const skipReasons: Record<string, number> = {};

        for (let i = 0; i < allLinks.length; i++) {
          const article = allLinks[i];
          const step = `正在抓取第 ${i + 1}/${allLinks.length} 篇`;
          send({ current: i + 1, total: allLinks.length, currentTitle: article.title.slice(0, 40), log: `${step}: ${article.title.slice(0, 30)}` });

          // URL dedup
          if (existingUrls.has(article.url)) {
            skipReasons["URL重复"] = (skipReasons["URL重复"] || 0) + 1;
            skipped++;
            continue;
          }

          // Title similarity dedup
          const isDuplicate = existingTitles.some((t) => titleSimilarity(t, article.title) > 0.85);
          if (isDuplicate) {
            skipReasons["标题相似"] = (skipReasons["标题相似"] || 0) + 1;
            skipped++;
            continue;
          }

          // Hash dedup (in-memory check, no DB query)
          const urlHash = hashUrl(article.url);
          if (existingHashes.has(urlHash)) {
            skipReasons["Hash重复"] = (skipReasons["Hash重复"] || 0) + 1;
            skipped++;
            continue;
          }

          // Extract content
          send({ log: `  正在提取正文...` });
          const adapter = getAdapter(article.mediaId)!;
          const extracted = await extractArticleContent(
            article.url,
            adapter.contentSelector,
            adapter.removeSelectors,
          );

          if (!extracted.fullText || extracted.fullText.length < 30) {
            const reason = extracted.error || "正文为空";
            send({ log: `  失败: ${reason}`, errorEntry: { title: article.title.slice(0, 40), reason } });
            failed++;
            continue;
          }

          if (minWordCount && extracted.charCount < minWordCount) {
            skipReasons["字数不足"] = (skipReasons["字数不足"] || 0) + 1;
            skipped++;
            continue;
          }

          // Insert
          send({ log: `  正在入库 (${extracted.charCount}字)...` });
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
            send({ log: `  入库失败: ${insertErr.message}`, errorEntry: { title: article.title.slice(0, 40), reason: `入库错误: ${insertErr.message}` } });
            failed++;
            continue;
          }

          existingUrls.add(article.url);
          existingTitles.push(article.title);
          existingHashes.add(urlHash);
          collected++;
          send({ log: `  ✓ ${article.title.slice(0, 40)} (${extracted.charCount}字)` });

          await new Promise((r) => setTimeout(r, DELAY_MS));
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
        send({
          phase: "done",
          log: `采集完成 (耗时 ${elapsed}s): 成功 ${collected} 篇, 跳过 ${skipped} 篇, 失败 ${failed} 篇`,
          summary: { collected, skipped, failed, skipReasons },
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
