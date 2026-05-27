"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, Upload } from "lucide-react";
import { loadBuiltinDict, parseLiwcDic, analyzeWithLiwc, LIWC_SENTIMENT_CATEGORIES, type LiwcDict, type LiwcResult } from "@/lib/liwc-dict";

/** Shallow compare two LiwcDict references */
let cachedDict: LiwcDict | null = null;
function getDict(): LiwcDict {
  if (!cachedDict) cachedDict = loadBuiltinDict();
  return cachedDict;
}

export function SentimentCalc() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<LiwcResult | null>(null);
  const [dictSource, setDictSource] = useState<"builtin" | "external">("builtin");
  const [isLoading, setIsLoading] = useState(false);

  function runAnalysis() {
    setIsLoading(true);
    const dict = getDict();
    // Small delay so the loading spinner renders
    setTimeout(() => {
      const r = analyzeWithLiwc(input, dict, dictSource);
      setResult(r);
      setIsLoading(false);
    }, 10);
  }

  async function handleLoadDic(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const dict = parseLiwcDic(text);
      if (!dict) {
        alert("无法解析 .dic 文件，请检查格式是否正确。\n期望格式：%\\n1  posemo\\n2  negemo\\n%\\nhappy  1");
        return;
      }
      cachedDict = dict;
      setDictSource("external");
      setResult(null);
    } catch {
      alert("文件读取失败");
    }
  }

  const catList = dictSource === "external" && cachedDict?.categories
    ? cachedDict.categories
    : LIWC_SENTIMENT_CATEGORIES;

  return (
    <div className="space-y-3">
      {/* Dictionary indicator */}
      <div className="flex items-center justify-between text-xs text-[#7F8A93]">
        <span>
          词典: {dictSource === "builtin" ? "内置 LIWC (~500词)" : "外部 .dic 文件"}
        </span>
        <label className="flex items-center gap-1 cursor-pointer hover:text-[#4A90A4] transition-colors">
          <Upload className="h-3 w-3" />
          加载外部词典
          <input type="file" accept=".dic" onChange={handleLoadDic} className="hidden" />
        </label>
      </div>

      {/* Input */}
      <textarea
        value={input}
        onChange={(e) => { setInput(e.target.value); setResult(null); }}
        rows={8}
        className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none font-mono"
        placeholder={"粘贴英文段落...\n" + "使用 LIWC 词典分析情感倾向"}
      />

      {/* Analyze button */}
      <Button
        onClick={runAnalysis}
        disabled={!input || isLoading}
        className="h-8 text-xs gap-1 bg-[#4A90A4] text-white hover:bg-[#3D7D8F]"
      >
        {isLoading ? (
          <>分析中...</>
        ) : (
          <><ThumbsUp className="h-3.5 w-3.5" /> 分析</>
        )}
      </Button>

      {/* Results */}
      {result && (
        <div className="space-y-3">
          {/* Overall tone */}
          <div className="bg-[#FAFBFC] rounded p-3 text-center border border-[#E2E5E9]">
            <p className="text-xs text-[#7F8A93] mb-1">
              总词数 {result.totalWords} · 情感倾向比 {result.toneRatio}%
            </p>
            <p className="text-lg font-semibold text-[#2D3436]">{result.tone}</p>
          </div>

          {/* Category details */}
          <div className="grid grid-cols-5 gap-2">
            {catList.map((cat) => {
              const count = result.categoryCounts[cat.code] ?? 0;
              const ratio = result.categoryRatios[cat.code] ?? 0;
              const bgColor =
                cat.code === "posemo" ? "bg-[#5DAD93]/5" :
                cat.code === "negemo" ? "bg-[#E67E22]/5" :
                cat.code === "anx" ? "bg-[#F0C060]/5" :
                cat.code === "anger" ? "bg-[#D44545]/5" :
                "bg-[#6B8FC0]/5";
              return (
                <div key={cat.code} className={`rounded p-2 text-center ${bgColor}`}>
                  <p className="text-[10px] text-[#7F8A93] mb-0.5">{cat.labelZh}</p>
                  <p className="text-xs font-mono font-medium text-[#2D3436]">{count}</p>
                  <p className="text-[10px] text-[#95A5A6]">{ratio}%</p>
                </div>
              );
            })}
          </div>

          {/* Quick interpretation */}
          <div className="text-[10px] text-[#95A5A6] space-y-0.5">
            <p>
              <strong>正面情绪 (posemo):</strong> {result.categoryCounts.posemo ?? 0} 词 ({result.categoryRatios.posemo ?? 0}%)
              {" · "}
              <strong>负面情绪 (negemo):</strong> {result.categoryCounts.negemo ?? 0} 词 ({result.categoryRatios.negemo ?? 0}%)
            </p>
            <p>
              <strong>焦虑 (anx):</strong> {result.categoryCounts.anx ?? 0}
              {" · "}
              <strong>愤怒 (anger):</strong> {result.categoryCounts.anger ?? 0}
              {" · "}
              <strong>悲伤 (sad):</strong> {result.categoryCounts.sad ?? 0}
            </p>
            <p>词典来源: {dictSource === "builtin" ? "内置 LIWC 情感词典" : "外部加载"} · 仅供学术研究参考</p>
          </div>
        </div>
      )}
    </div>
  );
}
