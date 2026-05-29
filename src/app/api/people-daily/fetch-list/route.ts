import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JSDOM } from "jsdom";

/**
 * GET /api/people-daily/fetch-list?date=2026-05-28
 *
 * Fetches the article list from People's Daily archive page for a given date.
 * Returns: { articles: [{title, url, date}], count }
 */

interface PdArticle {
  title: string;
  url: string;
  date: string;
}

async function fetchFromArchive(date: string): Promise<PdArticle[]> {
  // People's Daily daily archive: http://www.people.com.cn/n1/YYYY/MMDD/index.html
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateTag = `${yyyy}${mm}${dd}`;

  const archiveUrl = `http://www.people.com.cn/n1/${yyyy}/${dateTag}/index.html`;

  const res = await fetch(archiveUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; OutSight/1.0; Academic Research Tool)",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.error(`[PeopleDaily] Archive page HTTP ${res.status}: ${archiveUrl}`);
    return [];
  }

  const html = await res.text();
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const articles: PdArticle[] = [];
  const links = doc.querySelectorAll("a[href]");

  for (const a of Array.from(links)) {
    const href = a.getAttribute("href") || "";
    const title = a.textContent?.trim() || "";

    // Filter: article links typically match /n1/YYYY/MMDD/c*-*.html
    if (!href.includes(dateTag)) continue;
    if (title.length < 4) continue;
    // Skip navigation/footer links
    if (/index|more|page|list/i.test(href) && !/c\d+-\d+/.test(href)) continue;

    // Normalize URL
    let url = href;
    if (url.startsWith("//")) url = "http:" + url;
    else if (url.startsWith("/")) url = "http://www.people.com.cn" + url;
    else if (!url.startsWith("http")) continue;

    // Deduplicate
    if (articles.some((a) => a.url === url)) continue;

    articles.push({ title, url, date });
  }

  return articles;
}

async function fetchFromCategoryPages(date: string): Promise<PdArticle[]> {
  // Fallback: try category index pages (politics, economy, etc.)
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateTag = `${yyyy}${mm}${dd}`;

  const categories = ["politics", "world", " economy", "society", "military"];
  const articles: PdArticle[] = [];

  for (const cat of categories) {
    const catClean = cat.trim();
    const catUrl = `http://www.people.com.cn/n1/${yyyy}/${dateTag}/c${catClean === "politics" ? "1024" : catClean === "world" ? "1023" : catClean === "economy" ? "1026" : catClean === "society" ? "1027" : "1025"}-${Math.floor(Math.random() * 10000)}.html`;

    // Actually, the category pages don't work this way. Use the main index.
    // This is a fallback that doesn't really work differently.
    break;
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

  console.log(`[PeopleDaily] Fetching article list for ${date}`);

  try {
    let articles = await fetchFromArchive(date);

    console.log(`[PeopleDaily] Found ${articles.length} articles from archive`);

    return NextResponse.json({
      date,
      count: articles.length,
      articles,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(`[PeopleDaily] Fetch list error:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
