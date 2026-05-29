import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanHtml, cleanText } from "@/lib/text-cleaner";
import { htmlToPlainText } from "@/lib/text-cleaner";

/**
 * GET /api/articles/batch-clean
 * Query: limit (default 50), source (optional media filter)
 *
 * Batch-cleans existing full_text using text-cleaner.ts.
 * Safety: if word count drops >80%, marks metadata.needs_review instead of overwriting.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const source = searchParams.get("source") ?? undefined;

  // Query articles with existing full text
  let query = supabase
    .from("articles")
    .select("id, title, media, full_text, content, word_count, metadata")
    .not("full_text", "is", null)
    .in("full_text_status", ["complete", "partial"])
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (source) {
    query = query.eq("media", source);
  }

  const { data: articles, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ cleaned: 0, skipped: 0, total: 0, done: true });
  }

  let cleaned = 0;
  let skipped = 0;

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

    if (dropRatio > 0.8 && oldWordCount > 100) {
      // Mark as needs_review in metadata, don't overwrite
      const existingMeta = (article.metadata as Record<string, unknown>) ?? {};
      await supabase
        .from("articles")
        .update({
          metadata: {
            ...existingMeta,
            needs_review: true,
            original_word_count: oldWordCount,
            cleaned_word_count: newWordCount,
            review_reason: "word_count_drop_exceeds_80pct",
          },
        })
        .eq("id", article.id);
      skipped++;
    } else {
      // Apply cleaned text
      const updateData: Record<string, unknown> = {
        full_text: newFullText,
        word_count: newWordCount,
      };
      if (newContent) {
        updateData.content = newContent;
      }
      await supabase
        .from("articles")
        .update(updateData)
        .eq("id", article.id);
      cleaned++;
    }
  }

  // Check if there are more articles to process
  let remainingQuery = supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .not("full_text", "is", null)
    .in("full_text_status", ["complete", "partial"]);

  if (source) {
    remainingQuery = remainingQuery.eq("media", source);
  }

  const { count: remaining } = await remainingQuery;

  return NextResponse.json({
    cleaned,
    skipped,
    total: articles.length,
    remaining: (remaining ?? 0),
    done: (remaining ?? 0) === 0,
  });
}
