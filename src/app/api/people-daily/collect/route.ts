import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractContent } from "@/lib/content-extractor";
import { cleanHtml, htmlToPlainText, cleanText } from "@/lib/text-cleaner";

/**
 * POST /api/people-daily/collect
 * Body: { date: "2026-05-28", articles: [{title, url, date}], runAi?: boolean }
 *
 * Collects a batch of People's Daily articles:
 * 1. Fetch full text via extractContent
 * 2. Clean with text-cleaner
 * 3. Insert into articles table with source='people_daily'
 * 4. Optionally trigger AI pre-read
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: { date: string; articles: { title: string; url: string; date: string }[]; runAi?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const { date, articles, runAi } = body;
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

    // Extract content
    const extracted = await extractContent(article.url, { timeout: 20000 });

    if (!extracted.fullText || extracted.fullText.length < 50) {
      console.log(`[PeopleDaily] FAIL "${article.title.slice(0, 30)}": ${extracted.error || "no text"}`);
      failed++;
      results.push({ id: "", title: article.title, status: "failed" });
      continue;
    }

    // The text is already cleaned by extractContent (cleanHtml + htmlToPlainText + cleanText)
    const fullText = extracted.fullText;
    const content = extracted.content ?? fullText;

    // Chinese word count (character-based for Chinese)
    const charCount = fullText.replace(/\s/g, "").length;
    const wordCount = extracted.wordCount ?? fullText.split(/\s+/).filter(Boolean).length;

    // Insert into articles table
    const insertData = {
      title: article.title,
      url: article.url,
      url_hash: urlHash,
      source: "people_daily",
      media: "人民日报",
      source_type: "government" as const,
      language: "zh" as const,
      publish_date: extracted.publishDate ?? article.date,
      full_text: fullText,
      content: content,
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

    console.log(`[PeopleDaily] DONE "${article.title.slice(0, 30)}" chars=${charCount}`);
    collected++;
    results.push({ id: inserted.id, title: article.title, status: "collected" });

    // Delay between requests to be polite
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Optionally trigger AI pre-read for collected articles
  let aiTriggered = 0;
  if (runAi && collected > 0) {
    const collectedIds = results
      .filter((r) => r.status === "collected" && r.id)
      .map((r) => r.id);

    for (const id of collectedIds) {
      try {
        // Get the article content
        const { data: art } = await supabase
          .from("articles")
          .select("full_text")
          .eq("id", id)
          .single();

        if (art?.full_text) {
          // Call the pre-read pipeline via internal API
          const aiRes = await fetch(
            `${new URL(request.url).origin}/api/ai/pre-read`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ articleId: id }),
            }
          );
          if (aiRes.ok) aiTriggered++;
        }
      } catch (err) {
        console.error(`[PeopleDaily] AI pre-read failed for ${id}:`, err);
      }

      // Delay between AI calls
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`[PeopleDaily] Batch done: collected=${collected}, skipped=${skipped}, failed=${failed}, ai=${aiTriggered}`);

  return NextResponse.json({
    date,
    collected,
    skipped,
    failed,
    aiTriggered,
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
