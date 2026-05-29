import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JSDOM } from "jsdom";

/**
 * GET /api/people-daily/fetch-list?date=2026-05-28
 *
 * Fetches the article list from People's Daily digital newspaper (paper.people.com.cn).
 * Traverses edition pages (node_*.htm) to collect article links (nw.*.htm).
 * Returns: { articles: [{title, url, date}], count, debug }
 */

interface PdArticle {
  title: string;
  url: string;
  date: string;
}

const BASE_URL = "http://paper.people.com.cn/rmrb/html";

/**
 * Build the edition index URL for a given date.
 * Format: http://paper.people.com.cn/rmrb/html/YYYY-MM/DD/node_1.htm
 */
function buildEditionUrl(date: string): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${BASE_URL}/${yyyy}-${mm}/${dd}/node_1.htm`;
}

/**
 * Build the base path for a given date (used to resolve relative links).
 */
function buildBasePath(date: string): string {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${BASE_URL}/${yyyy}-${mm}/${dd}`;
}

/**
 * Extract edition page links (node_*.htm) from the front page.
 */
function extractEditionLinks(html: string, basePath: string): string[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const links: string[] = [];

  for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href") || "";
    // Match node_N.htm (edition pages)
    if (/node_\d+\.htm$/i.test(href)) {
      let url = href;
      if (url.startsWith("./")) url = basePath + url.slice(1);
      else if (url.startsWith("/")) url = "http://paper.people.com.cn" + url;
      else if (!url.startsWith("http")) url = basePath + "/" + url;
      if (!links.includes(url)) links.push(url);
    }
  }

  return links;
}

/**
 * Extract article links (nw.*.htm) from an edition page.
 */
function extractArticleLinks(html: string, basePath: string, date: string): PdArticle[] {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const articles: PdArticle[] = [];

  for (const a of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = a.getAttribute("href") || "";
    const title = a.textContent?.trim() || "";

    // Match article links: nw.XXXXXXXX.htm or similar
    if (!/nw\.\w+\.htm$/i.test(href)) continue;
    if (title.length < 2) continue;

    let url = href;
    if (url.startsWith("./")) url = basePath + url.slice(1);
    else if (url.startsWith("/")) url = "http://paper.people.com.cn" + url;
    else if (!url.startsWith("http")) url = basePath + "/" + url;

    // Deduplicate
    if (articles.some((a) => a.url === url)) continue;

    articles.push({ title, url, date });
  }

  return articles;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "请提供有效日期 (YYYY-MM-DD)" }, { status: 400 });
  }

  const basePath = buildBasePath(date);
  const editionUrl = buildEditionUrl(date);
  const debug: string[] = [];

  console.log(`[PeopleDaily] Fetching edition index: ${editionUrl}`);
  debug.push(`请求版面索引: ${editionUrl}`);

  try {
    // Step 1: Fetch the front page (node_1.htm) to get edition links
    const indexRes = await fetch(editionUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
      redirect: "follow",
    });

    debug.push(`索引页响应: HTTP ${indexRes.status}, Content-Length: ${indexRes.headers.get("content-length") || "unknown"}`);

    if (!indexRes.ok) {
      const htmlPreview = await indexRes.text().catch(() => "");
      debug.push(`响应内容预览: ${htmlPreview.slice(0, 300)}`);

      // Check if it's a weekend (no newspaper on Sundays)
      const dayOfWeek = new Date(date).getDay();
      if (dayOfWeek === 0) {
        return NextResponse.json({
          error: "该日期为周日，人民日报不出版",
          date,
          count: 0,
          articles: [],
          debug,
        });
      }

      return NextResponse.json({
        error: `版面索引页无法访问 (HTTP ${indexRes.status})`,
        date,
        count: 0,
        articles: [],
        debug,
      });
    }

    const indexHtml = await indexRes.text();
    debug.push(`索引页HTML长度: ${indexHtml.length}`);
    debug.push(`索引页前500字: ${indexHtml.slice(0, 500)}`);

    if (indexHtml.length < 200) {
      return NextResponse.json({
        error: "版面索引页内容过短，可能该日期无出版",
        date,
        count: 0,
        articles: [],
        debug,
      });
    }

    // Step 2: Extract edition page links (node_2.htm, node_3.htm, etc.)
    const editionLinks = extractEditionLinks(indexHtml, basePath);
    debug.push(`发现 ${editionLinks.length} 个版面链接`);

    if (editionLinks.length === 0) {
      // Fallback: try to extract articles directly from the front page
      const directArticles = extractArticleLinks(indexHtml, basePath, date);
      debug.push(`从首页直接提取 ${directArticles.length} 篇文章`);

      return NextResponse.json({
        date,
        count: directArticles.length,
        articles: directArticles,
        debug,
      });
    }

    // Step 3: Fetch each edition page and extract article links
    const allArticles: PdArticle[] = [];
    const maxEditions = Math.min(editionLinks.length, 10); // Limit to first 10 editions

    for (let i = 0; i < maxEditions; i++) {
      const edUrl = editionLinks[i];
      debug.push(`抓取版面 ${i + 1}/${maxEditions}: ${edUrl}`);

      try {
        const edRes = await fetch(edUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!edRes.ok) {
          debug.push(`  版面 ${i + 1} HTTP ${edRes.status}`);
          continue;
        }

        const edHtml = await edRes.text();
        const edArticles = extractArticleLinks(edHtml, basePath, date);
        debug.push(`  版面 ${i + 1} 提取 ${edArticles.length} 篇文章`);

        for (const art of edArticles) {
          if (!allArticles.some((a) => a.url === art.url)) {
            allArticles.push(art);
          }
        }
      } catch (err) {
        debug.push(`  版面 ${i + 1} 错误: ${err instanceof Error ? err.message : "unknown"}`);
      }

      // Small delay between requests
      if (i < maxEditions - 1) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    debug.push(`总计提取 ${allArticles.length} 篇文章`);
    console.log(`[PeopleDaily] Found ${allArticles.length} articles for ${date}`);

    return NextResponse.json({
      date,
      count: allArticles.length,
      articles: allArticles,
      debug,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    debug.push(`异常: ${msg}`);
    console.error(`[PeopleDaily] Fetch list error:`, msg);
    return NextResponse.json({ error: msg, date, count: 0, articles: [], debug }, { status: 500 });
  }
}
