import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanHtml, cleanText, htmlToPlainText } from "@/lib/text-cleaner";

/**
 * GET /api/articles/batch-clean
 * Query: limit (default 50), source (optional media filter)
 *
 * Batch-cleans existing full_text using text-cleaner.ts.
 * Uses metadata.cleaned_at to skip already-cleaned articles.
 * Safety: if word count drops >80%, marks metadata.needs_review instead of overwriting.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const source = searchParams.get("source") ?? undefined;

  // Query articles with existing full text that have NOT been cleaned yet
  // Exclude: metadata->>'cleaned_at' IS NOT NULL
  let query = supabase
    .from("articles")
    .select("id, title, media, full_text, content, word_count, metadata")
    .not("full_text", "is", null)
    .in("full_text_status", ["complete", "partial"])
    .or("metadata->>cleaned_at.is.null,metadata.is.null")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (source) {
    query = query.eq("media", source);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error("[BatchClean] Query error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    console.log("[BatchClean] No articles to clean, done=true");
    return NextResponse.json({ cleaned: 0, skipped: 0, total: 0, remaining: 0, done: true });
  }

  console.log(`[BatchClean] Processing batch of ${articles.length} articles`);

  let cleaned = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const article of articles) {
    const oldFullText = article.full_text ?? "";
    const oldWordCount = article.word_count ?? oldFullText.split(/\s+/).filter(Boolean).length;

    // Clean full_text
    const newFullText = cleanText(oldFullText);
    const newWordCount = newFullText.split(/\s+/).filter(Boolean).length;

    // Clean content (HTML) if present
    let newContent: string | null = null;
    if (article.content) {
      const cleanedHtml = cleanHtml(article.content);
      newContent = htmlToPlainText(cleanedHtml).length > 50 ? cleanedHtml : article.content;
    }

    // Safety check: word count drop > 80%
    const dropRatio = oldWordCount > 0 ? (oldWordCount - newWordCount) / oldWordCount : 0;

    const existingMeta = (article.metadata as Record<string, unknown>) ?? {};
    const metaUpdate: Record<string, unknown> = {
      ...existingMeta,
      cleaned_at: now,
    };

    if (dropRatio > 0.8 && oldWordCount > 100) {
      // Mark as needs_review, don't overwrite content
      metaUpdate.needs_review = true;
      metaUpdate.original_word_count = oldWordCount;
      metaUpdate.cleaned_word_count = newWordCount;
      metaUpdate.review_reason = "word_count_drop_exceeds_80pct";

      await supabase
        .from("articles")
        .update({ metadata: metaUpdate })
        .eq("id", article.id);

      console.log(`[BatchClean] SKIP ${article.id} "${article.title?.slice(0, 30)}" words ${oldWordCount}→${newWordCount} (drop ${(dropRatio * 100).toFixed(0)}%)`);
      skipped++;
    } else {
      // Apply cleaned text
      const updateData: Record<string, unknown> = {
        full_text: newFullText,
        word_count: newWordCount,
        metadata: metaUpdate,
      };
      if (newContent) {
        updateData.content = newContent;
      }

      await supabase
        .from("articles")
        .update(updateData)
        .eq("id", article.id);

      console.log(`[BatchClean] DONE ${article.id} "${article.title?.slice(0, 30)}" words ${oldWordCount}→${newWordCount}`);
      cleaned++;
    }
  }

  // Count remaining uncleaned articles with same filter
  let remainingQuery = supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .not("full_text", "is", null)
    .in("full_text_status", ["complete", "partial"])
    .or("metadata->>cleaned_at.is.null,metadata.is.null");

  if (source) {
    remainingQuery = remainingQuery.eq("media", source);
  }

  const { count: remaining } = await remainingQuery;
  const remainingVal = remaining ?? 0;

  console.log(`[BatchClean] Batch done: cleaned=${cleaned}, skipped=${skipped}, remaining=${remainingVal}`);

  return NextResponse.json({
    cleaned,
    skipped,
    total: articles.length,
    remaining: remainingVal,
    done: remainingVal === 0,
  });
}
