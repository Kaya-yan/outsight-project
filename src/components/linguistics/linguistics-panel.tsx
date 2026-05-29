"use client";

import { useState, useEffect, useCallback } from "react";
import { useLinguisticsStore, type WordFreqEntry, type NgramEntry, type CollocationEntry, type KWICEntry, type StyleStats } from "@/stores/linguistics-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Download, BarChart3, AlignLeft, Network, FileText, TrendingUp } from "lucide-react";

// ── Frequency Table ──

function FrequencyTable({ data }: { data: WordFreqEntry[] }) {
  const [search, setSearch] = useState("");
  const filtered = search ? data.filter((d) => d.word.includes(search.toLowerCase())) : data;

  const exportCSV = () => {
    const csv = "word,freq,percentage\n" + filtered.map((d) => `${d.word},${d.freq},${(d.percentage * 100).toFixed(2)}%`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word_frequency.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#95A5A6]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="筛选词汇..."
            className="h-7 pl-7 text-xs border-[#E2E5E9]"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-7 text-[10px] gap-1">
          <Download className="h-3 w-3" /> CSV
        </Button>
      </div>
      <div className="max-h-[400px] overflow-auto border border-[#E2E5E9] rounded">
        <table className="w-full text-xs">
          <thead className="bg-[#F7F8FA] sticky top-0">
            <tr>
              <th className="text-left px-3 py-1.5 text-[#7F8A93] font-medium">#</th>
              <th className="text-left px-3 py-1.5 text-[#7F8A93] font-medium">Word</th>
              <th className="text-right px-3 py-1.5 text-[#7F8A93] font-medium">Freq</th>
              <th className="text-right px-3 py-1.5 text-[#7F8A93] font-medium">%</th>
              <th className="px-3 py-1.5 text-[#7F8A93] font-medium">Distribution</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((d, i) => (
              <tr key={d.word} className="border-t border-[#F0F2F5] hover:bg-[#F7F8FA]">
                <td className="px-3 py-1 text-[#95A5A6]">{i + 1}</td>
                <td className="px-3 py-1 font-mono text-[#2D3436]">{d.word}</td>
                <td className="px-3 py-1 text-right text-[#7F8A93]">{d.freq}</td>
                <td className="px-3 py-1 text-right text-[#95A5A6]">{(d.percentage * 100).toFixed(2)}%</td>
                <td className="px-3 py-1 w-32">
                  <div className="w-full bg-[#E2E5E9] rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-[#4A90A4]" style={{ width: `${Math.min(100, (d.freq / (data[0]?.freq || 1)) * 100)}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-[#95A5A6]">显示 {Math.min(100, filtered.length)} / {filtered.length} 条</p>
    </div>
  );
}

// ── N-gram Table ──

function NgramTable({ data, label }: { data: NgramEntry[]; label: string }) {
  const exportCSV = () => {
    const csv = "ngram,freq\n" + data.map((d) => `"${d.ngram}",${d.freq}`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label}_ngrams.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据</span>;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#7F8A93]">{label} ({data.length})</span>
        <Button variant="ghost" size="sm" onClick={exportCSV} className="h-6 text-[10px] gap-1 text-[#95A5A6]">
          <Download className="h-2.5 w-2.5" /> CSV
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {data.slice(0, 30).map((d, i) => (
          <div key={d.ngram} className="flex items-center gap-2">
            <span className="text-[10px] text-[#95A5A6] w-5 text-right">{i + 1}</span>
            <span className="text-xs font-mono text-[#2D3436] flex-1 truncate">{d.ngram}</span>
            <div className="w-16 bg-[#E2E5E9] rounded-full h-1">
              <div className="h-1 rounded-full bg-[#6C5CE7]" style={{ width: `${(d.freq / (data[0]?.freq || 1)) * 100}%` }} />
            </div>
            <span className="text-[10px] text-[#95A5A6] w-6 text-right">{d.freq}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Collocation Table ──

function CollocationTable({ data, nodeWord }: { data: CollocationEntry[]; nodeWord: string }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据，尝试其他节点词</span>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#7F8A93]">
        节点词: <span className="font-mono text-[#4A90A4] font-medium">{nodeWord}</span> · 共 {data.length} 个搭配词
      </p>
      <div className="max-h-[400px] overflow-auto border border-[#E2E5E9] rounded">
        <table className="w-full text-xs">
          <thead className="bg-[#F7F8FA] sticky top-0">
            <tr>
              <th className="text-left px-3 py-1.5 text-[#7F8A93] font-medium">#</th>
              <th className="text-left px-3 py-1.5 text-[#7F8A93] font-medium">Collocate</th>
              <th className="text-right px-3 py-1.5 text-[#7F8A93] font-medium">Co-freq</th>
              <th className="text-right px-3 py-1.5 text-[#7F8A93] font-medium">MI</th>
              <th className="text-right px-3 py-1.5 text-[#7F8A93] font-medium">t-score</th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((d, i) => (
              <tr key={d.word} className="border-t border-[#F0F2F5] hover:bg-[#F7F8FA]">
                <td className="px-3 py-1 text-[#95A5A6]">{i + 1}</td>
                <td className="px-3 py-1 font-mono text-[#2D3436]">{d.word}</td>
                <td className="px-3 py-1 text-right text-[#7F8A93]">{d.freq}</td>
                <td className="px-3 py-1 text-right">
                  <span className={d.mi >= 3 ? "text-emerald-600 font-medium" : d.mi >= 1 ? "text-[#E67E22]" : "text-[#95A5A6]"}>
                    {d.mi.toFixed(2)}
                  </span>
                </td>
                <td className="px-3 py-1 text-right text-[#7F8A93]">{d.tScore.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-4 text-[10px] text-[#95A5A6]">
        <span>MI &ge; 3: 强搭配</span>
        <span>MI 1-3: 弱搭配</span>
        <span>t-score &ge; 2: 显著</span>
      </div>
    </div>
  );
}

// ── KWIC Concordance ──

function KWICTable({ data, nodeWord }: { data: KWICEntry[]; nodeWord: string }) {
  if (data.length === 0) return <span className="text-xs text-[#95A5A6]">暂无数据，尝试其他检索词</span>;

  return (
    <div className="space-y-2">
      <p className="text-xs text-[#7F8A93]">
        检索词: <span className="font-mono text-[#4A90A4] font-medium">{nodeWord}</span> · 共 {data.length} 条索引行
      </p>
      <div className="max-h-[500px] overflow-auto border border-[#E2E5E9] rounded font-mono text-xs leading-5">
        {data.slice(0, 200).map((d, i) => (
          <div key={i} className="flex border-b border-[#F0F2F5] hover:bg-[#F7F8FA]">
            <span className="w-8 shrink-0 text-right pr-2 py-1 text-[#95A5A6] bg-[#FAFBFC] border-r border-[#F0F2F5]">{i + 1}</span>
            <div className="flex-1 py-1 px-2 flex">
              <span className="text-right text-[#7F8A93] flex-1 truncate">{d.left}</span>
              <span className="px-1.5 mx-0.5 bg-[#4A90A4]/10 text-[#4A90A4] font-semibold rounded">{d.node}</span>
              <span className="text-[#2D3436] flex-1 truncate">{d.right}</span>
            </div>
          </div>
        ))}
      </div>
      {data.length > 200 && <p className="text-[10px] text-[#95A5A6]">显示前 200 条 / 共 {data.length} 条</p>}
    </div>
  );
}

// ── Style Stats Display ──

function StyleStatsDisplay({ stats }: { stats: StyleStats }) {
  const items = [
    { label: "总词数", value: stats.totalTokens.toLocaleString(), desc: "Total tokens" },
    { label: "句子数", value: stats.totalSentences.toLocaleString(), desc: "Total sentences" },
    { label: "平均词长", value: `${stats.avgWordLength} chars`, desc: "Mean characters per word" },
    { label: "平均句长", value: `${stats.avgSentenceLength} words`, desc: "Mean words per sentence" },
    { label: "词汇密度", value: `${(stats.lexicalDensity * 100).toFixed(1)}%`, desc: "Content words / total tokens" },
    { label: "TTR", value: `${(stats.ttr * 100).toFixed(1)}%`, desc: "Type-Token Ratio (vocabulary diversity)" },
    { label: "Hapax %", value: `${(stats.hapaxPercentage * 100).toFixed(1)}%`, desc: "Words appearing once / unique words" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <Card key={item.label} className="border-[#E2E5E9]">
          <CardContent className="p-3 text-center">
            <div className="text-base font-bold text-[#4A90A4]">{item.value}</div>
            <div className="text-[10px] text-[#95A5A6]">{item.label}</div>
            <div className="text-[9px] text-[#BDC3C7] mt-0.5">{item.desc}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Article Selector ──

function ArticleSelector({ onIdsChange }: { onIdsChange: (ids: string[]) => void }) {
  const [articles, setArticles] = useState<{ id: string; title: string; media: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/articles?${params.toString()}`);
      const json = await res.json();
      if (res.ok) setArticles(json.data ?? []);
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [search]);

  useEffect(() => { fetchArticles(); }, [fetchArticles]);

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((i) => i !== id) : [...selected, id];
    setSelected(next);
    onIdsChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#95A5A6]" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索英文语料..."
          className="h-7 pl-7 text-xs border-[#E2E5E9]"
        />
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <button onClick={() => { setSelected(articles.map((a) => a.id)); onIdsChange(articles.map((a) => a.id)); }} className="text-[#4A90A4] hover:underline">全选</button>
        <button onClick={() => { setSelected([]); onIdsChange([]); }} className="text-[#95A5A6] hover:underline">清空</button>
        <span className="text-[#95A5A6]">已选 {selected.length} 篇</span>
      </div>
      <div className="max-h-40 overflow-auto border border-[#E2E5E9] rounded divide-y divide-[#F0F2F5]">
        {isLoading ? (
          <div className="p-3"><Skeleton className="h-3 w-full bg-[#E2E5E9]" /></div>
        ) : articles.length === 0 ? (
          <div className="p-3 text-xs text-[#95A5A6] text-center">暂无英文语料</div>
        ) : (
          articles.map((a) => (
            <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-[#F7F8FA] cursor-pointer">
              <input
                type="checkbox"
                checked={selected.includes(a.id)}
                onChange={() => toggle(a.id)}
                className="rounded border-[#E2E5E9] text-[#4A90A4] focus:ring-[#4A90A4]"
              />
              <span className="text-xs text-[#2D3436] truncate flex-1">{a.title}</span>
              <span className="text-[10px] text-[#95A5A6] shrink-0">{a.media}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}

// ── Main Panel ──

const TABS = [
  { key: "frequency" as const, label: "词频", icon: BarChart3 },
  { key: "ngrams" as const, label: "N-grams", icon: AlignLeft },
  { key: "collocation" as const, label: "搭配", icon: Network },
  { key: "kwic" as const, label: "KWIC", icon: FileText },
  { key: "style" as const, label: "文体", icon: TrendingUp },
];

export function LinguisticsPanel() {
  const store = useLinguisticsStore();
  const [nodeInput, setNodeInput] = useState("");
  const [span, setSpan] = useState(5);
  const [inputMode, setInputMode] = useState<"articles" | "text">("articles");

  const handleAnalyze = () => {
    store.runFullAnalysis();
  };

  const handleCollocation = () => {
    if (!nodeInput.trim()) return;
    store.runCollocation(nodeInput.trim(), span);
  };

  const handleKWIC = () => {
    if (!nodeInput.trim()) return;
    store.runKWIC(nodeInput.trim());
  };

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <Card className="border-[#E2E5E9]">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-[#2D3436]">语料输入</h3>
            <div className="flex gap-1">
              <button
                onClick={() => setInputMode("articles")}
                className={`px-2 py-0.5 text-xs rounded ${inputMode === "articles" ? "bg-[#4A90A4]/10 text-[#4A90A4]" : "text-[#7F8A93]"}`}
              >
                选择文章
              </button>
              <button
                onClick={() => setInputMode("text")}
                className={`px-2 py-0.5 text-xs rounded ${inputMode === "text" ? "bg-[#4A90A4]/10 text-[#4A90A4]" : "text-[#7F8A93]"}`}
              >
                粘贴文本
              </button>
            </div>
          </div>

          {inputMode === "articles" ? (
            <ArticleSelector onIdsChange={(ids) => store.setSelectedIds(ids)} />
          ) : (
            <textarea
              value={store.rawText}
              onChange={(e) => store.setRawText(e.target.value)}
              placeholder="粘贴英文文本..."
              className="w-full h-32 p-2 text-xs border border-[#E2E5E9] rounded resize-none focus:outline-none focus:ring-1 focus:ring-[#4A90A4]"
            />
          )}

          <Button
            onClick={handleAnalyze}
            disabled={store.isLoading}
            className="bg-[#4A90A4] hover:bg-[#3D7D8F] text-white h-8 text-xs gap-1.5"
          >
            {store.isLoading ? (
              <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <BarChart3 className="h-3 w-3" />
            )}
            全量分析
          </Button>

          {store.error && <p className="text-xs text-[#E67E22]">{store.error}</p>}
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b border-[#E2E5E9]">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => store.setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-2 text-xs border-b-2 transition-colors ${
              store.activeTab === tab.key
                ? "border-[#4A90A4] text-[#4A90A4] font-medium"
                : "border-transparent text-[#7F8A93] hover:text-[#2D3436]"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {store.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-[#E2E5E9]" />)}
        </div>
      ) : (
        <>
          {store.activeTab === "frequency" && (
            <Card className="border-[#E2E5E9]">
              <CardContent className="p-4">
                <h3 className="text-xs text-[#7F8A93] mb-3">词频表 (停用词已过滤)</h3>
                <FrequencyTable data={store.topWords} />
              </CardContent>
            </Card>
          )}

          {store.activeTab === "ngrams" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <Card className="border-[#E2E5E9]">
                <CardContent className="p-4">
                  <NgramTable data={store.bigrams} label="2-gram" />
                </CardContent>
              </Card>
              <Card className="border-[#E2E5E9]">
                <CardContent className="p-4">
                  <NgramTable data={store.trigrams} label="3-gram" />
                </CardContent>
              </Card>
              <Card className="border-[#E2E5E9]">
                <CardContent className="p-4">
                  <NgramTable data={store.quadgrams} label="4-gram" />
                </CardContent>
              </Card>
            </div>
          )}

          {store.activeTab === "collocation" && (
            <Card className="border-[#E2E5E9]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-[10px] text-[#7F8A93] block mb-1">节点词 (Node word)</label>
                    <Input
                      value={nodeInput}
                      onChange={(e) => setNodeInput(e.target.value)}
                      placeholder="如: climate"
                      className="h-7 text-xs w-40 font-mono border-[#E2E5E9]"
                      onKeyDown={(e) => e.key === "Enter" && handleCollocation()}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#7F8A93] block mb-1">窗口 (Span)</label>
                    <Input
                      type="number"
                      value={span}
                      onChange={(e) => setSpan(parseInt(e.target.value) || 5)}
                      min={1}
                      max={10}
                      className="h-7 text-xs w-16 border-[#E2E5E9]"
                    />
                  </div>
                  <Button onClick={handleCollocation} size="sm" className="h-7 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white">
                    分析
                  </Button>
                </div>
                <CollocationTable data={store.collocations} nodeWord={store.nodeWord} />
              </CardContent>
            </Card>
          )}

          {store.activeTab === "kwic" && (
            <Card className="border-[#E2E5E9]">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-end gap-2">
                  <div>
                    <label className="text-[10px] text-[#7F8A93] block mb-1">检索词 (Search word)</label>
                    <Input
                      value={nodeInput}
                      onChange={(e) => setNodeInput(e.target.value)}
                      placeholder="如: government"
                      className="h-7 text-xs w-40 font-mono border-[#E2E5E9]"
                      onKeyDown={(e) => e.key === "Enter" && handleKWIC()}
                    />
                  </div>
                  <Button onClick={handleKWIC} size="sm" className="h-7 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white">
                    检索
                  </Button>
                </div>
                <KWICTable data={store.concordance} nodeWord={store.nodeWord} />
              </CardContent>
            </Card>
          )}

          {store.activeTab === "style" && store.styleStats && (
            <StyleStatsDisplay stats={store.styleStats} />
          )}

          {!store.isLoading && store.topWords.length === 0 && store.activeTab === "frequency" && (
            <div className="text-center py-8 text-xs text-[#95A5A6]">选择文章或粘贴文本后点击「全量分析」</div>
          )}
        </>
      )}
    </div>
  );
}
