import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanHtml, cleanText, htmlToPlainText, stripHtmlTags } from "@/lib/text-cleaner";

/**
 * GET /api/articles/batch-clean
 * Query:
 *   limit   — batch size (default 50, max 200)
 *   source  — optional media filter
 *   mode    — "html" (default): detect articles with HTML residue in full_text
 *             "force": re-clean ALL articles (ignore html_cleaned flag)
 *
 * HTML detection is done in-code (regex), not via SQL ilike — avoids false positives.
 * Uses metadata.html_cleaned to track which articles have been processed.
 * Safety: if word count drops >80%, marks metadata.needs_review instead of overwriting.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
  const source = searchParams.get("source") ?? undefined;
  const mode = searchParams.get("mode") ?? "html";
  const force = mode === "force";

  // ── Fetch articles with full_text ──
  let query = supabase
    .from("articles")
    .select("id, title, media, full_text, content, word_count, metadata")
    .not("full_text", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  // Unless force mode, skip already-cleaned articles
  if (!force) {
    query = query.or("metadata->>html_cleaned.is.null,metadata->>html_cleaned.eq.false");
  }

  if (source) {
    query = query.eq("media", source);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error(`[BatchClean] Query error (mode=${mode}):`, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    console.log(`[BatchClean] No articles to clean (mode=${mode}), done=true`);
    return NextResponse.json({ cleaned: 0, skipped: 0, total: 0, remaining: 0, done: true });
  }

  console.log(`[BatchClean] Processing batch of ${articles.length} articles (mode=${mode})`);

  // ── Process each article ──
  let cleaned = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const article of articles) {
    const oldFullText = article.full_text ?? "";
    const oldWordCount = article.word_count ?? oldFullText.split(/\s+/).filter(Boolean).length;

    // Detect HTML residue in code (not SQL) — avoids ilike false positives
    const hasHtml = /<[a-zA-Z][^>]*>/.test(oldFullText) || /\bhref\s*=/.test(oldFullText) || /data-[a-z-]+=/.test(oldFullText);

    if (!hasHtml && !force) {
      // No HTML detected — mark as cleaned so it won't be re-fetched
      const existingMeta = (article.metadata as Record<string, unknown>) ?? {};
      await supabase
        .from("articles")
        .update({ metadata: { ...existingMeta, html_cleaned: true, cleaned_at: now, skip_reason: "no_html" } })
        .eq("id", article.id);
      skipped++;
      console.log(`[BatchClean] SKIP ${article.id} "${article.title?.slice(0, 30)}" (no HTML)`);
      continue;
    }

    // Strip HTML + clean text
    const strippedText = stripHtmlTags(oldFullText);
    const newFullText = cleanText(strippedText);
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
      html_cleaned: true,
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

      console.log(`[BatchClean] REVIEW ${article.id} "${article.title?.slice(0, 30)}" words ${oldWordCount}→${newWordCount} (drop ${(dropRatio * 100).toFixed(0)}%)`);
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

  // ── Count remaining unprocessed articles ──
  let remainingQuery = supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .not("full_text", "is", null);

  if (!force) {
    remainingQuery = remainingQuery.or("metadata->>html_cleaned.is.null,metadata->>html_cleaned.eq.false");
  }

  if (source) {
    remainingQuery = remainingQuery.eq("media", source);
  }

  const { count: remaining } = await remainingQuery;
  const remainingVal = remaining ?? 0;

  console.log(`[BatchClean] Batch done (mode=${mode}): cleaned=${cleaned}, skipped=${skipped}, remaining=${remainingVal}`);

  return NextResponse.json({
    cleaned,
    skipped,
    total: articles.length,
    remaining: remainingVal,
    done: remainingVal === 0,
    mode,
  });
}
