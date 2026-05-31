"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3 } from "lucide-react";

// ── Types ──

interface ProfileData {
  articleId: string;
  title: string;
  textLength: number;
  totalTokens: number;
  totalContentWords: number;
  uniqueWords: number;
  lexicalMetrics: {
    ttr: number;
    lexicalDensity: number;
    topWords: { word: string; count: number }[];
    topChars: { char: string; count: number }[];
  };
  sentenceMetrics: {
    sentenceCount: number;
    avgLength: number;
    stdDev: number;
    histogram: { range: string; count: number }[];
  };
  bigrams: { bigram: string; count: number }[];
  sentiment: {
    positiveRatio: number;
    negativeRatio: number;
    positiveCount: number;
    negativeCount: number;
    positiveHits: string[];
    negativeHits: string[];
  };
  discourse: {
    pronouns: Record<string, { count: number; examples: string[] }>;
    quotes: {
      chineseQuotes: number;
      westernQuotes: number;
      bookTitleMarks: number;
      parentheses: number;
      dashes: number;
    };
    geoReferences: Record<string, { count: number; examples: string[] }>;
  };
  tfidf: { word: string; tfidf: number }[];
}

// ── Sub-components ──

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-4 rounded-full bg-[#1e3a5f]" />
      <h3 className="text-xs font-medium text-[#2D3436]">{title}</h3>
      {subtitle && <span className="text-[10px] text-[#95A5A6]">{subtitle}</span>}
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-[#F7F8FA] rounded-lg p-3 text-center">
      <div className="text-lg font-bold tabular-nums" style={{ color: color ?? "#1e3a5f" }}>{value}</div>
      <div className="text-[10px] text-[#7F8A93]">{label}</div>
      {sub && <div className="text-[9px] text-[#BDC3C7] mt-0.5">{sub}</div>}
    </div>
  );
}

function HorizontalBar({ data, labelKey, valueKey, color, maxItems = 20 }: {
  data: Record<string, unknown>[];
  labelKey: string;
  valueKey: string;
  color?: string;
  maxItems?: number;
}) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const sliced = data.slice(0, maxItems);
  const max = Math.max(...sliced.map((d) => d[valueKey] as number), 1);
  const baseColor = color ?? "#1e3a5f";

  return (
    <div className="space-y-1.5">
      {sliced.map((d, i) => {
        const pct = ((d[valueKey] as number) / max) * 100;
        return (
          <div key={i} className="group flex items-center gap-2">
            <span className="text-[10px] text-[#7F8A93] w-20 truncate shrink-0 text-right font-mono">{d[labelKey] as string}</span>
            <div className="flex-1 bg-[#F0F2F5] rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 group-hover:brightness-110"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${baseColor}cc, ${baseColor})`,
                  minWidth: pct > 0 ? "3px" : "0",
                }}
              />
            </div>
            <span className="text-[10px] text-[#636E72] w-8 text-right font-medium tabular-nums">{d[valueKey] as number}</span>
          </div>
        );
      })}
    </div>
  );
}

function SentimentBar({ positive, negative }: { positive: number; negative: number }) {
  const total = positive + negative;
  if (total === 0) return <span className="text-xs text-[#95A5A6]">未检测到情感词</span>;

  const posPct = (positive / total) * 100;
  const negPct = (negative / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#00B894] w-8">正面</span>
        <div className="flex-1 bg-[#F0F2F5] rounded-full h-3 overflow-hidden flex">
          <div className="h-full bg-[#00B894] transition-all" style={{ width: `${posPct}%` }} />
          <div className="h-full bg-[#E17055] transition-all" style={{ width: `${negPct}%` }} />
        </div>
        <span className="text-[10px] text-[#E17055] w-8 text-right">负面</span>
      </div>
      <div className="flex justify-between text-[10px] text-[#7F8A93]">
        <span>正面词 <b className="text-[#00B894]">{positive}</b> ({posPct.toFixed(1)}%)</span>
        <span>负面词 <b className="text-[#E17055]">{negative}</b> ({negPct.toFixed(1)}%)</span>
      </div>
    </div>
  );
}

function HistogramChart({ data }: { data: { range: string; count: number }[] }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-28">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-[#7F8A93] tabular-nums">{d.count}</span>
            <div
              className="w-full rounded-t transition-all hover:brightness-110"
              style={{
                height: `${Math.max(pct, 2)}%`,
                background: `linear-gradient(to top, #1e3a5f, #4a8ab5)`,
              }}
            />
            <span className="text-[9px] text-[#95A5A6] whitespace-nowrap">{d.range}</span>
          </div>
        );
      })}
    </div>
  );
}

function CharBubble({ chars }: { chars: { char: string; count: number }[] }) {
  if (chars.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;
  const max = chars[0]?.count ?? 1;

  return (
    <div className="flex flex-wrap gap-1.5 items-end">
      {chars.slice(0, 20).map((c) => {
        const ratio = c.count / max;
        const fontSize = Math.round(12 + ratio * 24);
        const bg = ratio > 0.6 ? "#1e3a5f" : ratio > 0.3 ? "#3a7a9a" : "#7ab5cc";
        const fg = ratio > 0.3 ? "#fff" : "#1e3a5f";
        return (
          <span
            key={c.char}
            className="inline-flex items-center justify-center rounded-lg cursor-default transition-transform hover:scale-110"
            style={{ fontSize: `${fontSize}px`, padding: "3px 5px", backgroundColor: bg, color: fg, fontFamily: "serif" }}
            title={`${c.char}: ${c.count}次`}
          >
            {c.char}
          </span>
        );
      })}
    </div>
  );
}

// ── Main Component ──

interface LinguisticProfileProps {
  articleId: string;
}

export function LinguisticProfile({ articleId }: LinguisticProfileProps) {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/domestic/linguistic-profile?articleId=${articleId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json as ProfileData);
      } else {
        setError(json.error ?? "加载失败");
      }
    } catch {
      setError("网络连接失败");
    } finally {
      setLoading(false);
    }
  };

  if (!data && !loading && !error) {
    return (
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-6 flex flex-col items-center gap-3">
          <BarChart3 className="h-8 w-8 text-[#1e3a5f]" />
          <p className="text-sm text-[#7F8A93]">纯统计分析，无需 AI API 调用</p>
          <button
            onClick={loadProfile}
            className="px-4 py-2 bg-[#1e3a5f] text-white text-xs rounded-md hover:bg-[#2a5280] transition-colors"
          >
            生成语言学画像
          </button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-8 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-[#1e3a5f]" />
          <span className="text-sm text-[#7F8A93]">正在计算语言学指标...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-[#E17055]/30">
        <CardContent className="p-4 text-sm text-[#E17055]">{error}</CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { lexicalMetrics, sentenceMetrics, sentiment, discourse, tfidf } = data;

  return (
    <div className="space-y-4">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
        <MetricCard label="总词数" value={data.totalContentWords.toLocaleString()} sub="content words" />
        <MetricCard label="词汇多样性" value={`${(lexicalMetrics.ttr * 100).toFixed(1)}%`} sub="TTR" color="#6C5CE7" />
        <MetricCard label="词汇密度" value={`${(lexicalMetrics.lexicalDensity * 100).toFixed(1)}%`} sub="实词/总词" color="#00B894" />
        <MetricCard label="平均句长" value={`${sentenceMetrics.avgLength}字`} sub={`σ=${sentenceMetrics.stdDev}`} />
        <MetricCard label="句子数" value={sentenceMetrics.sentenceCount} />
      </div>

      {/* ── Word Frequency + Char Frequency ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionHeader title="词频 Top 20" subtitle="content words" />
            <HorizontalBar
              data={lexicalMetrics.topWords as unknown as Record<string, unknown>[]}
              labelKey="word"
              valueKey="count"
              color="#1e3a5f"
            />
          </CardContent>
        </Card>

        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionHeader title="字频 Top 20" subtitle="Chinese characters" />
            <CharBubble chars={lexicalMetrics.topChars} />
          </CardContent>
        </Card>
      </div>

      {/* ── Sentence Length Distribution ── */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <SectionHeader title="句长分布" subtitle={`${sentenceMetrics.sentenceCount} sentences, μ=${sentenceMetrics.avgLength}, σ=${sentenceMetrics.stdDev}`} />
          <HistogramChart data={sentenceMetrics.histogram} />
        </CardContent>
      </Card>

      {/* ── Bigrams ── */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4">
          <SectionHeader title="高频搭配" subtitle="相邻词对 Top 20" />
          <HorizontalBar
            data={data.bigrams as unknown as Record<string, unknown>[]}
            labelKey="bigram"
            valueKey="count"
            color="#3a7a9a"
          />
        </CardContent>
      </Card>

      {/* ── Sentiment + Discourse ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionHeader title="情感词典分析" subtitle="基于词典匹配" />
            <SentimentBar positive={sentiment.positiveCount} negative={sentiment.negativeCount} />
            {sentiment.positiveHits.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] text-[#7F8A93]">正面词:</span>
                {sentiment.positiveHits.map((w) => (
                  <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-[#00B894]/10 text-[#00B894]">{w}</span>
                ))}
              </div>
            )}
            {sentiment.negativeHits.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-[10px] text-[#7F8A93]">负面词:</span>
                {sentiment.negativeHits.map((w) => (
                  <span key={w} className="text-[10px] px-1.5 py-0.5 rounded bg-[#E17055]/10 text-[#E17055]">{w}</span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionHeader title="话语特征" subtitle="人称·标点·地名" />
            <div className="space-y-3">
              {/* Pronouns */}
              {Object.keys(discourse.pronouns).length > 0 && (
                <div>
                  <span className="text-[10px] text-[#7F8A93] block mb-1">人称代词</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(discourse.pronouns).map(([cat, info]) => (
                      <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-[#1e3a5f]/10 text-[#1e3a5f]">
                        {cat}: {info.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Quotes */}
              <div>
                <span className="text-[10px] text-[#7F8A93] block mb-1">标点符号</span>
                <div className="flex flex-wrap gap-1.5">
                  {discourse.quotes.chineseQuotes > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#2D3436]">引号 {discourse.quotes.chineseQuotes}</span>
                  )}
                  {discourse.quotes.bookTitleMarks > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#2D3436]">书名号 {discourse.quotes.bookTitleMarks}</span>
                  )}
                  {discourse.quotes.parentheses > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#2D3436]">括号 {discourse.quotes.parentheses}</span>
                  )}
                  {discourse.quotes.dashes > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F0F2F5] text-[#2D3436]">破折号 {discourse.quotes.dashes}</span>
                  )}
                </div>
              </div>
              {/* Geo references */}
              {Object.keys(discourse.geoReferences).length > 0 && (
                <div>
                  <span className="text-[10px] text-[#7F8A93] block mb-1">地域指向</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(discourse.geoReferences).map(([cat, info]) => (
                      <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-[#6C5CE7]/10 text-[#6C5CE7]">
                        {cat}: {info.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TF-IDF ── */}
      {tfidf.length > 0 && (
        <Card className="border-[#E2E5E9]">
          <CardContent className="p-4">
            <SectionHeader title="TF-IDF 标志性词汇" subtitle="基于语料库 IDF 计算" />
            <HorizontalBar
              data={tfidf as unknown as Record<string, unknown>[]}
              labelKey="word"
              valueKey="tfidf"
              color="#6C5CE7"
              maxItems={10}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
