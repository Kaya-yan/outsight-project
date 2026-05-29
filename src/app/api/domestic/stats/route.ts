import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentChinese } from "@/lib/domestic/chinese-segmenter";
import { STOPWORDS_ZH } from "@/lib/stopwords-zh";

/**
 * GET /api/domestic/stats?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Aggregate statistics for domestic media articles.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  let query = supabase
    .from("articles")
    .select("id, media, publish_date, word_count, full_text, metadata")
    .eq("source", "domestic_media")
    .order("publish_date", { ascending: false });

  if (dateFrom) query = query.gte("publish_date", dateFrom);
  if (dateTo) query = query.lte("publish_date", dateTo);

  const { data: articles, error } = await query.limit(500);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      totalArticles: 0,
      mediaDistribution: [],
      dateDistribution: [],
      avgWordCount: 0,
      sentimentDistribution: [],
      topWords: [],
    });
  }

  // Media distribution
  const mediaMap = new Map<string, number>();
  for (const a of articles) {
    mediaMap.set(a.media, (mediaMap.get(a.media) || 0) + 1);
  }
  const mediaDistribution = Array.from(mediaMap.entries())
    .map(([media, count]) => ({ media, count }))
    .sort((a, b) => b.count - a.count);

  // Date distribution
  const dateMap = new Map<string, number>();
  for (const a of articles) {
    const d = a.publish_date?.slice(0, 10) ?? "unknown";
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  }
  const dateDistribution = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Average word count
  const totalWords = articles.reduce((sum, a) => sum + (a.word_count || 0), 0);
  const avgWordCount = Math.round(totalWords / articles.length);

  // Sentiment distribution (from AI analysis metadata)
  const sentimentMap = new Map<string, number>();
  for (const a of articles) {
    const ai = (a.metadata as Record<string, unknown>)?.domestic_ai_analysis as Record<string, unknown> | undefined;
    const polarity = (ai?.sentiment as Record<string, unknown>)?.polarity as string | undefined;
    if (polarity) {
      sentimentMap.set(polarity, (sentimentMap.get(polarity) || 0) + 1);
    }
  }
  const sentimentDistribution = Array.from(sentimentMap.entries())
    .map(([polarity, count]) => ({ polarity, count }));

  // Word frequency (top 60)
  const wordFreq = new Map<string, number>();
  for (const a of articles) {
    if (!a.full_text) continue;
    const words = segmentChinese(a.full_text);
    for (const w of words) {
      if (w.length < 2 || STOPWORDS_ZH.has(w)) continue;
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }
  const topWords = Array.from(wordFreq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 60);

  return NextResponse.json({
    totalArticles: articles.length,
    mediaDistribution,
    dateDistribution,
    avgWordCount,
    sentimentDistribution,
    topWords,
  });
}
