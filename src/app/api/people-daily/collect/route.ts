import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { JSDOM } from "jsdom";
import { cleanHtml, htmlToPlainText, cleanText } from "@/lib/text-cleaner";

/**
 * POST /api/people-daily/collect
 * Body: { date: "2026-05-28", articles: [{title, url, date}] }
 *
 * Collects People's Daily articles from paper.people.com.cn:
 * 1. Fetch HTML → extract content from #ozoom or #articleContent
 * 2. Clean with text-cleaner
 * 3. Insert into articles table with source='people_daily'
 */

interface PdArticle {
  title: string;
  url: string;
  date: string;
}

/**
 * Extract content from People's Daily digital newspaper page.
 * These pages have a specific structure: content is in #ozoom or .text_content.
 */
async function extractPdContent(url: string): Promise<{
  title: string;
  content: string;
  fullText: string;
  author: string | null;
  publishDate: string | null;
  charCount: number;
  error?: string;
}> {
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

    if (!res.ok) {
      return { title: "", content: "", fullText: "", author: null, publishDate: null, charCount: 0, error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    if (html.length < 200) {
      return { title: "", content: "", fullText: "", author: null, publishDate: null, charCount: 0, error: "response too short" };
    }

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Extract title
    let title = "";
    const titleEl = doc.querySelector("h1") || doc.querySelector(".title") || doc.querySelector("title");
    if (titleEl) title = titleEl.textContent?.trim() || "";

    // Extract main content - People's Daily uses specific containers
    let contentHtml = "";
    const contentSelectors = [
      "#ozoom",           // Common in rmrb pages
      "#articleContent",  // Alternative container
      ".text_content",    // Another variant
      ".article_content", // Another variant
      "td[class*='t_content']", // Table-based layout
    ];

    for (const sel of contentSelectors) {
      const el = doc.querySelector(sel);
      if (el && (el.textContent?.trim().length || 0) > 50) {
        contentHtml = el.innerHTML;
        break;
      }
    }

    // Fallback: try Readability or body text
    if (!contentHtml) {
      // Try to get all <p> tags within the main area
      const mainArea = doc.querySelector("body");
      if (mainArea) {
        const paragraphs = mainArea.querySelectorAll("p");
        if (paragraphs.length > 2) {
          contentHtml = Array.from(paragraphs).map(p => `<p>${p.innerHTML}</p>`).join("");
        }
      }
    }

    if (!contentHtml) {
      return { title, content: "", fullText: "", author: null, publishDate: null, charCount: 0, error: "no content container found" };
    }

    // Clean the content
    const cleanedHtml = cleanHtml(contentHtml);
    let fullText = htmlToPlainText(cleanedHtml);
    fullText = cleanText(fullText);

    if (fullText.length < 30) {
      return { title, content: cleanedHtml, fullText: "", author: null, publishDate: null, charCount: 0, error: "insufficient text after cleaning" };
    }

    // Extract author (if present)
    let author: string | null = null;
    const authorEl = doc.querySelector(".author") || doc.querySelector("[class*='editor']");
    if (authorEl) author = authorEl.textContent?.replace(/责任编辑[:：]?\s*/g, "").trim() || null;

    const charCount = fullText.replace(/\s/g, "").length;

    return {
      title,
      content: cleanedHtml,
      fullText,
      author,
      publishDate: null, // Will be set from the request date
      charCount,
    };
  } catch (err) {
    return {
      title: "",
      content: "",
      fullText: "",
      author: null,
      publishDate: null,
      charCount: 0,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { date: string; articles: PdArticle[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const { date, articles } = body;
  if (!date || !articles?.length) {
    return NextResponse.json({ error: "缺少日期或文章列表" }, { status: 400 });
  }

  console.log(`[PeopleDaily] Collecting ${articles.length} articles for ${date}`);

  let collected = 0;
  let skipped = 0;
  let failed = 0;
  const results: { id: string; title: string; status: string }[] = [];

  for (const article of articles) {
    // Check if already exists (by URL hash)
    const urlHash = await sha256(article.url);
    const { data: existing } = await supabase
      .from("articles")
      .select("id")
      .eq("url_hash", urlHash)
      .maybeSingle();

    if (existing) {
      console.log(`[PeopleDaily] SKIP (exists) "${article.title.slice(0, 30)}"`);
      skipped++;
      results.push({ id: existing.id, title: article.title, status: "skipped" });
      continue;
    }

    // Extract content using People's Daily specific extractor
    const extracted = await extractPdContent(article.url);

    if (!extracted.fullText || extracted.fullText.length < 30) {
      console.log(`[PeopleDaily] FAIL "${article.title.slice(0, 30)}": ${extracted.error || "no text"}`);
      failed++;
      results.push({ id: "", title: article.title, status: "failed" });
      continue;
    }

    const charCount = extracted.charCount;
    // For Chinese text, word count = character count (approximate)
    const wordCount = charCount;

    // Insert into articles table
    const insertData = {
      title: extracted.title || article.title,
      url: article.url,
      url_hash: urlHash,
      source: "people_daily",
      media: "人民日报",
      source_type: "government" as const,
      language: "zh" as const,
      publish_date: date,
      full_text: extracted.fullText,
      content: extracted.content,
      full_text_status: "complete" as const,
      word_count: wordCount,
      status: "已入库" as const,
      metadata: {
        char_count: charCount,
        collected_at: new Date().toISOString(),
        collection_source: "people_daily_test",
        author: extracted.author,
      },
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("articles")
      .insert(insertData)
      .select("id")
      .single();

    if (insertErr) {
      console.error(`[PeopleDaily] INSERT error for "${article.title.slice(0, 30)}":`, insertErr.message);
      failed++;
      results.push({ id: "", title: article.title, status: "failed" });
      continue;
    }

    console.log(`[PeopleDaily] DONE "${(extracted.title || article.title).slice(0, 30)}" chars=${charCount}`);
    collected++;
    results.push({ id: inserted.id, title: article.title, status: "collected" });

    // Delay between requests
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`[PeopleDaily] Batch done: collected=${collected}, skipped=${skipped}, failed=${failed}`);

  return NextResponse.json({
    date,
    collected,
    skipped,
    failed,
    aiTriggered: 0,
    total: articles.length,
    results,
  });
}

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
