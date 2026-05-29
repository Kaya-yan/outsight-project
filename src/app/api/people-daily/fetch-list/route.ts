import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/people-daily/fetch-list?date=2026-05-29
 *
 * Scrapes www.people.com.cn main page to find article links for the given date.
 * URL pattern: http://XXX.people.com.cn/n1/YYYY/MMDD/cXXXXX-XXXXXXXX.html
 */

interface PdArticle {
  title: string;
  url: string;
  date: string;
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

  // Build date tag: YYYYMMDD
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const dateTag = `${yyyy}${mm}${dd}`;
  const dateSlash = `${yyyy}/${mm}${dd}`;
  const debug: string[] = [];

  debug.push(`目标日期: ${date} (tag=${dateTag})`);

  // Pages to scrape (multiple channels increase coverage)
  const pages = [
    "http://www.people.com.cn/",
    "http://cpc.people.com.cn/",
    "http://politics.people.com.cn/GB/1024/index.html",
    "http://finance.people.com.cn/",
    "http://society.people.com.cn/",
    "http://world.people.com.cn/",
  ];

  const allArticles: PdArticle[] = [];
  const seenUrls = new Set<string>();

  for (const pageUrl of pages) {
    try {
      debug.push(`请求: ${pageUrl}`);
      const res = await fetch(pageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9",
        },
        signal: AbortSignal.timeout(12000),
        redirect: "follow",
      });

      if (!res.ok) {
        debug.push(`  HTTP ${res.status}`);
        continue;
      }

      const html = await res.text();
      debug.push(`  HTML 长度: ${html.length}`);

      // Extract article links matching the date pattern
      // Pattern: href="http://XXX.people.com.cn/n1/YYYY/MMDD/cXXXXX-XXXXXXXX.html"
      const linkRegex = /href="(https?:\/\/[^"]*people\.com\.cn\/n1\/\d{4}\/\d{4}\/c\d+-\d+\.html)"[^>]*>([^<]+)/gi;
      let match: RegExpExecArray | null;

      while ((match = linkRegex.exec(html)) !== null) {
        const url = match[1];
        const rawTitle = match[2].trim();

        // Filter by date
        if (!url.includes(`/n1/${dateSlash}/`)) continue;
        if (rawTitle.length < 3) continue;
        if (seenUrls.has(url)) continue;

        seenUrls.add(url);
        allArticles.push({ title: rawTitle, url, date });
      }

      debug.push(`  累计匹配 ${allArticles.length} 篇`);
    } catch (err) {
      debug.push(`  错误: ${err instanceof Error ? err.message : "unknown"}`);
    }

    // Small delay between page requests
    await new Promise((r) => setTimeout(r, 300));
  }

  debug.push(`总计: ${allArticles.length} 篇文章`);

  console.log(`[PeopleDaily] Found ${allArticles.length} articles for ${date}`);

  return NextResponse.json({
    date,
    count: allArticles.length,
    articles: allArticles,
    debug,
  });
}
