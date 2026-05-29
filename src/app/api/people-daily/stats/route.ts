import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { filterStopwords } from "@/lib/stopwords-zh";

/**
 * GET /api/people-daily/stats?date=2026-05-28
 *
 * Returns character and word frequency analysis for People's Daily articles
 * collected on the given date.
 */

interface WordFreq {
  word: string;
  count: number;
}

interface StatsResult {
  date: string;
  articleCount: number;
  totalChars: number;
  uniqueChars: number;
  avgSentenceLen: number;
  charFrequency: WordFreq[];
  wordFrequency: WordFreq[];
  sentences: number;
}

function segmentChinese(text: string): string[] {
  // Use Intl.Segmenter for Chinese word segmentation
  // Available in Node.js 18+ and modern browsers
  try {
    const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
    const words: string[] = [];
    for (const { segment, isWordLike } of segmenter.segment(text)) {
      if (isWordLike && segment.length > 1) {
        words.push(segment);
      }
    }
    return words;
  } catch {
    // Fallback: simple 2-gram splitting
    const clean = text.replace(/[^一-鿿]/g, "");
    const grams: string[] = [];
    for (let i = 0; i < clean.length - 1; i++) {
      grams.push(clean.slice(i, i + 2));
    }
    return grams;
  }
}

function countFrequency(items: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const item of items) {
    freq.set(item, (freq.get(item) || 0) + 1);
  }
  return freq;
}

function topN(freq: Map<string, number>, n: number): WordFreq[] {
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
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

  // Fetch all People's Daily articles for this date
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, title, full_text, metadata")
    .eq("source", "people_daily")
    .eq("publish_date", date)
    .not("full_text", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      date,
      articleCount: 0,
      totalChars: 0,
      uniqueChars: 0,
      avgSentenceLen: 0,
      charFrequency: [],
      wordFrequency: [],
      sentences: 0,
    });
  }

  // Combine all full_text
  const allText = articles.map((a) => a.full_text || "").join("\n\n");

  // Character frequency (Chinese characters only)
  const chineseChars = allText.replace(/[^一-鿿]/g, "");
  const charFreq = countFrequency(Array.from(chineseChars));
  const totalChars = chineseChars.length;
  const uniqueChars = charFreq.size;

  // Sentence count
  const sentences = allText.split(/[。！？.!?]+/).filter((s) => s.trim().length > 0).length;
  const avgSentenceLen = sentences > 0 ? Math.round(totalChars / sentences) : 0;

  // Word frequency (Chinese word segmentation)
  const allWords = segmentChinese(allText);
  const filteredWords = filterStopwords(allWords);
  const wordFreq = countFrequency(filteredWords);

  const result: StatsResult = {
    date,
    articleCount: articles.length,
    totalChars,
    uniqueChars,
    avgSentenceLen,
    charFrequency: topN(charFreq, 50),
    wordFrequency: topN(wordFreq, 80),
    sentences,
  };

  return NextResponse.json(result);
}
