import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { segmentChinese, countCharFrequency } from "@/lib/domestic/chinese-segmenter";
import { STOPWORDS_ZH } from "@/lib/stopwords-zh";

/**
 * GET /api/domestic/linguistic-profile?articleId=xxx
 *
 * Pure statistical linguistic profile — zero AI API calls.
 * All computation done server-side using Chinese segmentation + dictionaries.
 */

// ── Sentiment dictionaries (curated for Chinese political/media discourse) ──

const POSITIVE_WORDS = new Set([
  "发展", "创新", "进步", "成就", "突破", "增长", "提升", "优化",
  "繁荣", "稳定", "和谐", "振兴", "富强", "文明", "民主", "自由",
  "平等", "公正", "法治", "爱国", "敬业", "诚信", "友善", "积极",
  "健康", "安全", "保障", "完善", "加强", "深化", "加快", "推动",
  "促进", "坚持", "实现", "提高", "增强", "改善", "升级", "前进",
  "胜利", "成功", "希望", "信心", "决心", "力量", "团结", "奋进",
  "高质量", "新格局", "现代化", "共同富裕", "绿水青山", "伟大复兴",
]);

const NEGATIVE_WORDS = new Set([
  "危机", "冲突", "下降", "风险", "困难", "挑战", "问题", "矛盾",
  "衰退", "下滑", "下跌", "恶化", "动荡", "战乱", "贫困", "饥饿",
  "污染", "破坏", "损害", "威胁", "侵略", "霸权", "制裁", "打压",
  "腐败", "贪污", "违法", "犯罪", "事故", "灾害", "疫情", "死亡",
  "失业", "通胀", "债务", "赤字", "泡沫", "崩盘", "暴雷", "跑路",
  "焦虑", "恐慌", "不安", "担忧", "质疑", "批评", "抗议", "示威",
]);

// ── Pronoun categories ──

const PRONOUNS: Record<string, string[]> = {
  "第一人称单数": ["我"],
  "第一人称复数": ["我们", "咱们", "我国", "我方"],
  "第二人称": ["你", "您", "你们"],
  "第三人称单数": ["他", "她", "它"],
  "第三人称复数": ["他们", "她们", "它们", "他俩"],
  "指示代词": ["这", "那", "此", "本", "该", "各", "每"],
};

// ── Geographic reference words ──

const GEO_WORDS: Record<string, string[]> = {
  "中国": ["中国", "我国", "国内", "中华", "华夏"],
  "国际": ["国际", "全球", "世界", "海外", "外国", "西方", "欧美", "亚洲", "非洲", "拉美"],
  "地方": ["北京", "上海", "广东", "深圳", "浙江", "江苏", "山东", "四川", "湖北", "河南"],
  "治理层级": ["中央", "国务院", "部委", "省委", "市委", "县委", "基层", "地方"],
};

// ── Helpers ──

function splitSentences(text: string): string[] {
  // Split on Chinese sentence-ending punctuation
  return text.split(/(?<=[。！？；\n])/g).filter((s) => s.trim().length > 0);
}

function stdDev(nums: number[]): number {
  if (nums.length === 0) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const variance = nums.reduce((s, n) => s + (n - mean) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

// ── Main handler ──

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  if (!articleId) {
    return NextResponse.json({ error: "缺少 articleId" }, { status: 400 });
  }

  // Fetch target article
  const { data: article, error: fetchErr } = await supabase
    .from("articles")
    .select("id, full_text, title")
    .eq("id", articleId)
    .single();

  if (fetchErr || !article) {
    return NextResponse.json({ error: "文章不存在" }, { status: 404 });
  }

  const text = article.full_text ?? "";
  if (text.length < 30) {
    return NextResponse.json({ error: "文章正文过短" }, { status: 400 });
  }

  // ── 1. Word segmentation ──
  const allWords = segmentChinese(text);
  const contentWords: string[] = [];
  const wordFreq = new Map<string, number>();

  for (const w of allWords) {
    if (w.length < 2 || STOPWORDS_ZH.has(w)) continue;
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    contentWords.push(w);
  }

  const topWords = Array.from(wordFreq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ── 2. Character frequency ──
  const charFreq = countCharFrequency(text);
  const topChars = Array.from(charFreq.entries())
    .map(([char, count]) => ({ char, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ── 3. Lexical metrics ──
  const uniqueWords = new Set(contentWords);
  const totalContentWords = contentWords.length;
  const ttr = totalContentWords > 0 ? uniqueWords.size / totalContentWords : 0;

  // Lexical density = content words / total tokens (including stopwords)
  const totalTokens = allWords.length;
  const lexicalDensity = totalTokens > 0 ? totalContentWords / totalTokens : 0;

  // ── 4. Sentence metrics ──
  const sentences = splitSentences(text);
  const sentenceLengths = sentences.map((s) => s.replace(/\s/g, "").length);
  const avgSentenceLength = sentenceLengths.length > 0
    ? Math.round(sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length)
    : 0;
  const sentenceStdDev = Math.round(stdDev(sentenceLengths));

  // Sentence length histogram
  const histogram = [
    { range: "0-20", count: 0 },
    { range: "21-40", count: 0 },
    { range: "41-60", count: 0 },
    { range: "61-80", count: 0 },
    { range: "80+", count: 0 },
  ];
  for (const len of sentenceLengths) {
    if (len <= 20) histogram[0].count++;
    else if (len <= 40) histogram[1].count++;
    else if (len <= 60) histogram[2].count++;
    else if (len <= 80) histogram[3].count++;
    else histogram[4].count++;
  }

  // ── 5. Bigram analysis ──
  const bigramFreq = new Map<string, number>();
  for (let i = 0; i < contentWords.length - 1; i++) {
    const bg = contentWords[i] + contentWords[i + 1];
    bigramFreq.set(bg, (bigramFreq.get(bg) || 0) + 1);
  }
  const topBigrams = Array.from(bigramFreq.entries())
    .map(([bigram, count]) => ({ bigram, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // ── 6. Sentiment dictionary analysis ──
  let positiveCount = 0;
  let negativeCount = 0;
  const positiveHits: string[] = [];
  const negativeHits: string[] = [];

  for (const w of allWords) {
    if (POSITIVE_WORDS.has(w)) {
      positiveCount++;
      if (positiveHits.length < 5 && !positiveHits.includes(w)) positiveHits.push(w);
    }
    if (NEGATIVE_WORDS.has(w)) {
      negativeCount++;
      if (negativeHits.length < 5 && !negativeHits.includes(w)) negativeHits.push(w);
    }
  }

  const sentimentTotal = positiveCount + negativeCount;
  const sentiment = {
    positiveRatio: sentimentTotal > 0 ? Math.round((positiveCount / sentimentTotal) * 1000) / 10 : 0,
    negativeRatio: sentimentTotal > 0 ? Math.round((negativeCount / sentimentTotal) * 1000) / 10 : 0,
    positiveCount,
    negativeCount,
    positiveHits,
    negativeHits,
  };

  // ── 7. Pronoun distribution ──
  const pronounDist: Record<string, { count: number; examples: string[] }> = {};
  for (const [category, pronouns] of Object.entries(PRONOUNS)) {
    let count = 0;
    const examples: string[] = [];
    for (const p of pronouns) {
      const regex = new RegExp(p, "g");
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
        if (examples.length < 3) examples.push(p);
      }
    }
    if (count > 0) pronounDist[category] = { count, examples };
  }

  // ── 8. Quote and punctuation stats ──
  const quotes = {
    chineseQuotes: (text.match(/[“”‘’「」『』]/g) ?? []).length,
    westernQuotes: (text.match(/["']/g) ?? []).length,
    bookTitleMarks: (text.match(/《》/g) ?? []).length,
    parentheses: (text.match(/[（）()]/g) ?? []).length,
    dashes: (text.match(/[—–]/g) ?? []).length,
  };

  // ── 9. Geographic references ──
  const geoDist: Record<string, { count: number; examples: string[] }> = {};
  for (const [category, words] of Object.entries(GEO_WORDS)) {
    let count = 0;
    const examples: string[] = [];
    for (const w of words) {
      const regex = new RegExp(w, "g");
      const matches = text.match(regex);
      if (matches) {
        count += matches.length;
        if (examples.length < 3 && !examples.includes(w)) examples.push(w);
      }
    }
    if (count > 0) geoDist[category] = { count, examples };
  }

  // ── 10. TF-IDF ──
  // Fetch all domestic articles for corpus-level IDF
  let tfidfTop: { word: string; tfidf: number }[] = [];

  try {
    const { data: corpus } = await supabase
      .from("articles")
      .select("full_text")
      .eq("source", "domestic_media")
      .not("full_text", "is", null)
      .limit(500);

    if (corpus && corpus.length > 1) {
      const docCount = corpus.length;

      // Compute document frequency for each word in the target article
      const df = new Map<string, number>();
      const uniqueContentWords = Array.from(wordFreq.keys());

      // Initialize
      for (const w of uniqueContentWords) df.set(w, 0);

      // Count document frequency across corpus
      for (const doc of corpus) {
        if (!doc.full_text) continue;
        const docWords = new Set(segmentChinese(doc.full_text).filter((w) => w.length >= 2 && !STOPWORDS_ZH.has(w)));
        for (const w of uniqueContentWords) {
          if (docWords.has(w)) df.set(w, (df.get(w) ?? 0) + 1);
        }
      }

      // Compute TF-IDF
      const tfidfScores: { word: string; tfidf: number }[] = [];
      for (const [word, count] of wordFreq.entries()) {
        const tf = count / totalContentWords;
        const docFreq = df.get(word) ?? 0;
        const idf = Math.log((docCount + 1) / (docFreq + 1)) + 1; // smoothed IDF
        tfidfScores.push({ word, tfidf: Math.round(tf * idf * 10000) / 10000 });
      }

      tfidfTop = tfidfScores
        .sort((a, b) => b.tfidf - a.tfidf)
        .slice(0, 10);
    }
  } catch {
    // TF-IDF is optional — if it fails, just return empty
  }

  // ── Response ──
  return NextResponse.json({
    articleId,
    title: article.title,
    textLength: text.length,
    totalTokens,
    totalContentWords,
    uniqueWords: uniqueWords.size,

    // Lexical metrics
    lexicalMetrics: {
      ttr: Math.round(ttr * 1000) / 1000,
      lexicalDensity: Math.round(lexicalDensity * 1000) / 1000,
      topWords,
      topChars,
    },

    // Sentence metrics
    sentenceMetrics: {
      sentenceCount: sentences.length,
      avgLength: avgSentenceLength,
      stdDev: sentenceStdDev,
      histogram,
    },

    // Bigrams
    bigrams: topBigrams,

    // Sentiment
    sentiment,

    // Discourse features
    discourse: {
      pronouns: pronounDist,
      quotes,
      geoReferences: geoDist,
    },

    // TF-IDF
    tfidf: tfidfTop,
  });
}
