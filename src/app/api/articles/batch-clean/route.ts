import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanHtml, cleanText, htmlToPlainText, stripHtmlTags } from "@/lib/text-cleaner";

/**
 * GET /api/articles/batch-clean
 * Query:
 *   limit   — batch size (default 50, max 200)
 *   source  — optional media filter
 *   mode    — "html" (default): detect articles with HTML residue in full_text
 *             "uncleaned": only articles without cleaned_at (legacy behavior)
 *             "force": all articles with full_text (re-clean everything)
 *
 * Detects HTML residue via Supabase `ilike` on common tag patterns.
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

  // ── Build query based on mode ──
  let query = supabase
    .from("articles")
    .select("id, title, media, full_text, content, word_count, metadata")
    .not("full_text", "is", null)
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (mode === "html") {
    // Detect HTML residue: full_text contains common HTML tag patterns
    // Supabase `or()` with `ilike` — each condition targets a distinct HTML signature
    query = query.or(
      "full_text.ilike.%<a %," +       // <a href=...
      "full_text.ilike.%</a>%," +       // </a>
      "full_text.ilike.%<p>%," +        // <p>
      "full_text.ilike.%</p>%," +       // </p>
      "full_text.ilike.%<em>%," +       // <em>
      "full_text.ilike.%<span %," +     // <span class=...
      "full_text.ilike.%href=%," +      // href= (attribute leak)
      "full_text.ilike.%data-%," +      // data-link-name= etc.
      "full_text.ilike.%<br%," +        // <br> or <br/>
      "full_text.ilike.%<div %"         // <div class=...
    );
  } else if (mode === "force") {
    // All articles with full_text — no additional filter
    query = query.in("full_text_status", ["complete", "partial", "missing", "paywalled", "manual_uploaded"]);
  } else {
    // Legacy: only articles without cleaned_at
    query = query
      .in("full_text_status", ["complete", "partial"])
      .or("metadata->>cleaned_at.is.null,metadata.is.null");
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

  let cleaned = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const article of articles) {
    const oldFullText = article.full_text ?? "";
    const oldWordCount = article.word_count ?? oldFullText.split(/\s+/).filter(Boolean).length;

    // Quick check: does this article actually have HTML residue?
    // (The `or` query may match false positives like "a < b" in math text)
    const hasHtml = /<[a-zA-Z][^>]*>/.test(oldFullText) || /\bhref\s*=/.test(oldFullText);
    if (!hasHtml) {
      // No HTML detected — just mark as cleaned and skip
      const existingMeta = (article.metadata as Record<string, unknown>) ?? {};
      await supabase
        .from("articles")
        .update({ metadata: { ...existingMeta, cleaned_at: now, skip_reason: "no_html_detected" } })
        .eq("id", article.id);
      skipped++;
      continue;
    }

    // Clean full_text: strip HTML tags first, then normalize whitespace
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

  // Count remaining articles matching the same criteria
  let remainingQuery = supabase
    .from("articles")
    .select("id", { count: "exact", head: true })
    .not("full_text", "is", null);

  if (mode === "html") {
    remainingQuery = remainingQuery.or(
      "full_text.ilike.%<a %," +
      "full_text.ilike.%</a>%," +
      "full_text.ilike.%<p>%," +
      "full_text.ilike.%</p>%," +
      "full_text.ilike.%<em>%," +
      "full_text.ilike.%<span %," +
      "full_text.ilike.%href=%," +
      "full_text.ilike.%data-%," +
      "full_text.ilike.%<br%," +
      "full_text.ilike.%<div %"
    );
  } else if (mode === "force") {
    // no additional filter
  } else {
    remainingQuery = remainingQuery
      .in("full_text_status", ["complete", "partial"])
      .or("metadata->>cleaned_at.is.null,metadata.is.null");
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
