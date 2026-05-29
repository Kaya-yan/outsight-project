/**
 * English corpus linguistics analysis toolkit.
 * Pure functions operating on text strings — no database or IO dependencies.
 */

// ── Tokenization ──

const ENGLISH_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "as", "is", "was", "are", "were", "been", "be", "have", "has", "had",
  "do", "does", "did", "will", "would", "could", "should", "may", "might", "shall",
  "can", "this", "that", "these", "those", "it", "its", "i", "me", "my", "we", "our",
  "you", "your", "he", "him", "his", "she", "her", "they", "them", "their", "what",
  "which", "who", "whom", "when", "where", "why", "how", "not", "no", "nor", "so",
  "if", "then", "than", "too", "very", "just", "about", "above", "after", "again",
  "all", "also", "any", "because", "before", "between", "both", "each", "few",
  "more", "most", "other", "some", "such", "only", "own", "same", "into", "over",
  "through", "during", "out", "up", "down", "here", "there", "once", "while",
  "still", "well", "back", "even", "new", "now", "way", "use", "find", "long",
  "make", "many", "much", "get", "got", "said", "say", "one", "two", "first",
  "also", "like", "just", "because", "time", "very", "come", "could", "go",
  "see", "know", "take", "people", "year", "think", "see", "look", "want",
  "give", "day", "good", "man", "woman", "thing", "mr", "mrs", "ms",
]);

export interface Token {
  word: string;
  index: number; // position in token stream
  sentence: number;
  start: number; // char offset in original text
  end: number;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const sentenceBreaks = /([.!?]+)\s+/g;
  const wordRegex = /\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g;

  // Find sentence boundaries
  const sentEnds: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = sentenceBreaks.exec(text)) !== null) {
    sentEnds.push(m.index + m[1].length);
  }

  let wordIdx = 0;
  let sentIdx = 0;
  let wm: RegExpExecArray | null;

  while ((wm = wordRegex.exec(text)) !== null) {
    while (sentEnds[sentIdx] !== undefined && wm.index >= sentEnds[sentIdx]) {
      sentIdx++;
    }
    tokens.push({
      word: wm[0].toLowerCase(),
      index: wordIdx++,
      sentence: sentIdx,
      start: wm.index,
      end: wm.index + wm[0].length,
    });
  }

  return tokens;
}

// ── Word Frequency ──

export interface WordFreqEntry {
  word: string;
  freq: number;
  percentage: number;
}

export function wordFrequency(
  tokens: Token[],
  opts?: { minLength?: number; excludeStopwords?: boolean },
): WordFreqEntry[] {
  const minLength = opts?.minLength ?? 2;
  const excludeStop = opts?.excludeStopwords ?? false;
  const freq = new Map<string, number>();
  let total = 0;

  for (const t of tokens) {
    if (t.word.length < minLength) continue;
    if (excludeStop && ENGLISH_STOPWORDS.has(t.word)) continue;
    freq.set(t.word, (freq.get(t.word) || 0) + 1);
    total++;
  }

  return Array.from(freq.entries())
    .map(([word, f]) => ({ word, freq: f, percentage: total > 0 ? f / total : 0 }))
    .sort((a, b) => b.freq - a.freq);
}

// ── N-grams ──

export interface NgramEntry {
  ngram: string;
  freq: number;
}

export function ngrams(tokens: Token[], n: 2 | 3 | 4, opts?: { excludeStopwords?: boolean }): NgramEntry[] {
  const excludeStop = opts?.excludeStopwords ?? false;
  const freq = new Map<string, number>();
  const words = tokens.map((t) => t.word);

  for (let i = 0; i <= words.length - n; i++) {
    const slice = words.slice(i, i + n);
    if (excludeStop && slice.some((w) => ENGLISH_STOPWORDS.has(w))) continue;
    const key = slice.join(" ");
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  return Array.from(freq.entries())
    .map(([ngram, f]) => ({ ngram, freq: f }))
    .sort((a, b) => b.freq - a.freq)
    .slice(0, 100);
}

// ── Collocation Analysis ──

export interface CollocationEntry {
  word: string;
  freq: number;
  mi: number;     // Mutual Information score
  tScore: number;  // t-score
}

export function collocations(
  tokens: Token[],
  nodeWord: string,
  span: number = 5,
  minFreq: number = 2,
): CollocationEntry[] {
  const node = nodeWord.toLowerCase();
  const totalTokens = tokens.length;
  const wordFreq = new Map<string, number>();
  const collocFreq = new Map<string, number>();

  // Count node word frequency and collocate co-occurrence
  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i].word;
    wordFreq.set(w, (wordFreq.get(w) || 0) + 1);

    if (w === node) {
      const start = Math.max(0, i - span);
      const end = Math.min(tokens.length - 1, i + span);
      for (let j = start; j <= end; j++) {
        if (j === i) continue;
        const cw = tokens[j].word;
        if (cw.length < 2 || ENGLISH_STOPWORDS.has(cw)) continue;
        collocFreq.set(cw, (collocFreq.get(cw) || 0) + 1);
      }
    }
  }

  const nodeFreq = wordFreq.get(node) || 0;
  if (nodeFreq === 0) return [];

  const results: CollocationEntry[] = [];

  for (const [word, coFreq] of collocFreq) {
    if (coFreq < minFreq) continue;
    const wordF = wordFreq.get(word) || 0;

    // MI = log2( (O11 * N) / (R1 * C1) ) where O11=coFreq, N=total, R1=nodeFreq, C1=wordF
    const mi = Math.log2((coFreq * totalTokens) / (nodeFreq * wordF));

    // t-score = (O11 - E11) / sqrt(O11) where E11 = (R1 * C1) / N
    const expected = (nodeFreq * wordF) / totalTokens;
    const tScore = (coFreq - expected) / Math.sqrt(coFreq);

    results.push({ word, freq: coFreq, mi: Math.round(mi * 100) / 100, tScore: Math.round(tScore * 100) / 100 });
  }

  return results.sort((a, b) => b.mi - a.mi);
}

// ── KWIC Concordance ──

export interface KWICEntry {
  left: string;
  node: string;
  right: string;
  sentence: number;
  position: number;
}

export function kwic(tokens: Token[], nodeWord: string, contextSize: number = 5): KWICEntry[] {
  const node = nodeWord.toLowerCase();
  const results: KWICEntry[] = [];
  const words = tokens.map((t) => t.word);

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].word === node) {
      const leftStart = Math.max(0, i - contextSize);
      const rightEnd = Math.min(words.length - 1, i + contextSize);
      results.push({
        left: words.slice(leftStart, i).join(" "),
        node: words[i],
        right: words.slice(i + 1, rightEnd + 1).join(" "),
        sentence: tokens[i].sentence,
        position: i,
      });
    }
  }

  return results;
}

// ── Style Statistics ──

export interface StyleStats {
  totalTokens: number;
  totalSentences: number;
  avgWordLength: number;       // mean characters per word
  avgSentenceLength: number;   // mean words per sentence
  lexicalDensity: number;      // content words / total words
  ttr: number;                 // type-token ratio
  hapaxPercentage: number;     // words appearing exactly once / total unique
}

export function styleStats(tokens: Token[]): StyleStats {
  if (tokens.length === 0) {
    return { totalTokens: 0, totalSentences: 0, avgWordLength: 0, avgSentenceLength: 0, lexicalDensity: 0, ttr: 0, hapaxPercentage: 0 };
  }

  const totalTokens = tokens.length;
  const totalSentences = tokens[tokens.length - 1].sentence + 1;

  // Avg word length
  const totalChars = tokens.reduce((s, t) => s + t.word.length, 0);
  const avgWordLength = Math.round((totalChars / totalTokens) * 100) / 100;

  // Avg sentence length
  const avgSentenceLength = Math.round((totalTokens / Math.max(totalSentences, 1)) * 100) / 100;

  // Lexical density (content words = not stopwords, length >= 3)
  const contentWords = tokens.filter((t) => t.word.length >= 3 && !ENGLISH_STOPWORDS.has(t.word)).length;
  const lexicalDensity = Math.round((contentWords / totalTokens) * 1000) / 1000;

  // TTR
  const unique = new Set(tokens.map((t) => t.word));
  const ttr = Math.round((unique.size / totalTokens) * 1000) / 1000;

  // Hapax (words appearing once)
  const freq = new Map<string, number>();
  for (const t of tokens) freq.set(t.word, (freq.get(t.word) || 0) + 1);
  const hapax = Array.from(freq.values()).filter((f) => f === 1).length;
  const hapaxPercentage = Math.round((hapax / unique.size) * 1000) / 1000;

  return { totalTokens, totalSentences, avgWordLength, avgSentenceLength, lexicalDensity, ttr, hapaxPercentage };
}

// ── Full Analysis Result ──

export interface LinguisticsResult {
  styleStats: StyleStats;
  topWords: WordFreqEntry[];
  bigrams: NgramEntry[];
  trigrams: NgramEntry[];
  quadgrams: NgramEntry[];
}

export function analyzeText(text: string): LinguisticsResult {
  const tokens = tokenize(text);

  return {
    styleStats: styleStats(tokens),
    topWords: wordFrequency(tokens, { minLength: 2, excludeStopwords: true }).slice(0, 80),
    bigrams: ngrams(tokens, 2, { excludeStopwords: true }),
    trigrams: ngrams(tokens, 3, { excludeStopwords: true }),
    quadgrams: ngrams(tokens, 4),
  };
}
