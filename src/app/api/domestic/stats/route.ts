import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentChinese, countCharFrequency } from "@/lib/domestic/chinese-segmenter";
import { STOPWORDS_ZH } from "@/lib/stopwords-zh";

/**
 * GET /api/domestic/stats?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 * Aggregate statistics for domestic media articles.
 *
 * Two-phase query: basic stats (no full_text) + word analysis (limited subset).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Phase 1: Basic stats (no full_text, lightweight)
  let baseQuery = supabase
    .from("articles")
    .select("id, media, publish_date, word_count, metadata")
    .eq("source", "domestic_media")
    .order("publish_date", { ascending: false });

  if (dateFrom) baseQuery = baseQuery.gte("publish_date", dateFrom);
  if (dateTo) baseQuery = baseQuery.lte("publish_date", dateTo);

  const { data: articles, error } = await baseQuery.limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      totalArticles: 0, mediaDistribution: [], dateDistribution: [],
      avgWordCount: 0, sentimentDistribution: [], topWords: [],
      topChars: [], topBigrams: [], ttr: 0, sttr: 0, lexicalDensity: 0,
    });
  }

  // Media distribution
  const mediaMap = new Map<string, number>();
  for (const a of articles) mediaMap.set(a.media, (mediaMap.get(a.media) || 0) + 1);
  const mediaDistribution = Array.from(mediaMap.entries())
    .map(([media, count]) => ({ media, count })).sort((a, b) => b.count - a.count);

  // Date distribution
  const dateMap = new Map<string, number>();
  for (const a of articles) {
    const d = a.publish_date?.slice(0, 10) ?? "unknown";
    dateMap.set(d, (dateMap.get(d) || 0) + 1);
  }
  const dateDistribution = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

  // Average word count
  const totalWords = articles.reduce((sum, a) => sum + (a.word_count || 0), 0);
  const avgWordCount = Math.round(totalWords / articles.length);

  // Sentiment distribution
  const sentimentMap = new Map<string, number>();
  for (const a of articles) {
    const ai = (a.metadata as Record<string, unknown>)?.domestic_ai_analysis as Record<string, unknown> | undefined;
    const polarity = (ai?.sentiment as Record<string, unknown>)?.polarity as string | undefined;
    if (polarity) sentimentMap.set(polarity, (sentimentMap.get(polarity) || 0) + 1);
  }
  const sentimentDistribution = Array.from(sentimentMap.entries())
    .map(([polarity, count]) => ({ polarity, count }));

  // Phase 2: Word analysis (fetch full_text for limited subset)
  const sampleIds = articles.slice(0, 100).map((a) => a.id);
  const { data: textSamples } = await supabase
    .from("articles")
    .select("full_text")
    .in("id", sampleIds);

  const wordFreq = new Map<string, number>();
  const bigramFreq = new Map<string, number>();
  const trigramFreq = new Map<string, number>();
  const allWords: string[] = [];
  const charFreq = new Map<string, number>();

  // Sentence-level metrics
  const sentenceLengths: number[] = [];
  let totalWordLength = 0;
  let totalWordCount = 0;
  const wordLengthDist = { mono: 0, bi: 0, tri: 0, multi: 0 }; // 1, 2, 3, 4+ chars

  // Connective words (连接词)
  const CONNECTIVES = new Set([
    "因此", "然而", "但是", "所以", "因为", "由于", "虽然", "不过", "而且", "并且",
    "同时", "此外", "另外", "总之", "由此可见", "综上所述", "换句话说", "具体来说",
    "首先", "其次", "最后", "一方面", "另一方面", "不仅", "而且", "既", "又",
    "无论", "不论", "只要", "只有", "除非", "即使", "尽管", "不管", "既然",
    "于是", "从而", "进而", "继而", "随后", "接着", "然后", "之前", "之后",
    "相反", "反之", "否则", "不然", "要不然", "倘若", "假如", "如果", "假设",
  ]);
  let connectiveCount = 0;

  // Chinese sentence-ending punctuation
  const SENTENCE_END = /[。！？；\n]/g;

  for (const a of textSamples ?? []) {
    if (!a.full_text) continue;

    // Character frequency
    const cf = countCharFrequency(a.full_text);
    for (const [ch, cnt] of cf) charFreq.set(ch, (charFreq.get(ch) || 0) + cnt);

    // Sentence splitting
    const sentences = a.full_text.split(SENTENCE_END).filter((s) => s.trim().length > 0);
    for (const s of sentences) {
      sentenceLengths.push(s.replace(/\s/g, "").length);
    }

    // Word segmentation
    const words = segmentChinese(a.full_text);
    const filtered: string[] = [];
    for (const w of words) {
      if (w.length < 2 || STOPWORDS_ZH.has(w)) continue;
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
      filtered.push(w);
      allWords.push(w);

      // Word length stats
      totalWordLength += w.length;
      totalWordCount++;
      if (w.length === 1) wordLengthDist.mono++;
      else if (w.length === 2) wordLengthDist.bi++;
      else if (w.length === 3) wordLengthDist.tri++;
      else wordLengthDist.multi++;

      // Connective detection
      if (CONNECTIVES.has(w)) connectiveCount++;
    }

    // Bigrams
    for (let i = 0; i < filtered.length - 1; i++) {
      const bg = filtered[i] + filtered[i + 1];
      bigramFreq.set(bg, (bigramFreq.get(bg) || 0) + 1);
    }

    // Trigrams
    for (let i = 0; i < filtered.length - 2; i++) {
      const tg = filtered[i] + filtered[i + 1] + filtered[i + 2];
      trigramFreq.set(tg, (trigramFreq.get(tg) || 0) + 1);
    }
  }

  const topWords = Array.from(wordFreq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count).slice(0, 40);

  const topChars = Array.from(charFreq.entries())
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count).slice(0, 30);

  const topBigrams = Array.from(bigramFreq.entries())
    .map(([bigram, count]) => ({ bigram, count }))
    .sort((a, b) => b.count - a.count).slice(0, 20);

  const topTrigrams = Array.from(trigramFreq.entries())
    .map(([trigram, count]) => ({ trigram, count }))
    .sort((a, b) => b.count - a.count).slice(0, 20);

  // TTR (Type-Token Ratio)
  const uniqueWords = new Set(allWords);
  const ttr = allWords.length > 0 ? uniqueWords.size / allWords.length : 0;

  // STTR (Standardized TTR)
  let sttrSum = 0;
  let sttrWindows = 0;
  const windowSize = 1000;
  for (let i = 0; i <= allWords.length - windowSize; i += windowSize) {
    const window = allWords.slice(i, i + windowSize);
    const windowUnique = new Set(window).size;
    sttrSum += windowUnique / windowSize;
    sttrWindows++;
  }
  const sttr = sttrWindows > 0 ? sttrSum / sttrWindows : ttr;

  // Lexical density
  const contentWords = allWords.length;
  const totalTokens = (textSamples ?? []).reduce((sum, a) => sum + (a.full_text?.length || 0), 0);
  const lexicalDensity = totalTokens > 0 ? contentWords / totalTokens : 0;

  // Average word length (chars per word)
  const avgWordLength = totalWordCount > 0 ? Math.round((totalWordLength / totalWordCount) * 100) / 100 : 0;

  // Sentence metrics
  const avgSentenceLength = sentenceLengths.length > 0
    ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
    : 0;
  const sentenceStdDev = sentenceLengths.length > 0
    ? Math.round(Math.sqrt(sentenceLengths.reduce((s, n) => s + (n - avgSentenceLength) ** 2, 0) / sentenceLengths.length))
    : 0;

  // Sentence length histogram (5 bins)
  const sentenceHistogram = [
    { range: "0-20", count: 0 },
    { range: "21-40", count: 0 },
    { range: "41-60", count: 0 },
    { range: "61-80", count: 0 },
    { range: "80+", count: 0 },
  ];
  for (const len of sentenceLengths) {
    if (len <= 20) sentenceHistogram[0].count++;
    else if (len <= 40) sentenceHistogram[1].count++;
    else if (len <= 60) sentenceHistogram[2].count++;
    else if (len <= 80) sentenceHistogram[3].count++;
    else sentenceHistogram[4].count++;
  }

  // Chinese readability index (中文可读性指数)
  // Formula: 206.835 - 1.015 × avg_sentence_len - 84.6 × avg_word_len
  const readabilityIndex = Math.round((206.835 - 1.015 * avgSentenceLength - 84.6 * avgWordLength) * 10) / 10;

  // Connective density (连接词密度) = connectives per 1000 words
  const connectiveDensity = totalWordCount > 0 ? Math.round((connectiveCount / totalWordCount) * 1000 * 100) / 100 : 0;

  return NextResponse.json({
    totalArticles: articles.length,
    mediaDistribution,
    dateDistribution,
    avgWordCount,
    sentimentDistribution,
    topWords,
    topChars,
    topBigrams,
    ttr: Math.round(ttr * 1000) / 1000,
    sttr: Math.round(sttr * 1000) / 1000,
    lexicalDensity: Math.round(lexicalDensity * 1000) / 1000,
    // New metrics
    avgWordLength,
    wordLengthDist,
    sentenceMetrics: {
      avgLength: avgSentenceLength,
      stdDev: sentenceStdDev,
      count: sentenceLengths.length,
      histogram: sentenceHistogram,
    },
    readabilityIndex,
    connectiveDensity,
    topTrigrams,
  });
}
