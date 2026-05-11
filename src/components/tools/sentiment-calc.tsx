"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

const POSITIVE = new Set([
  "progress","success","growth","opportunity","advance","improve","benefit","strength","achievement","innovation",
  "prosperity","stability","cooperation","partnership","leadership","development","reform","progress","positive",
  "optimistic","confident","robust","resilient","dynamic","vibrant","promising","favorable","constructive","productive",
  "efficient","effective","sustainable","inclusive","equitable","harmonious","peaceful","modern","advanced",
  "strategic","comprehensive","enhanced","strengthened","expanded","deepened","boosted","surged","soared","thrived",
  "flourish","excel","outperform","surpass","breakthrough","milestone","remarkable","impressive","notable","substantial",
  "significant","considerable","tremendous","unprecedented","historic","landmark","pivotal","transformative",
]);

const NEGATIVE = new Set([
  "threat","crisis","conflict","decline","risk","challenge","tension","dispute","instability","uncertainty",
  "sanction","tariff","boycott","embargo","disruption","collapse","recession","inflation","debt","deficit",
  "corruption","crackdown","suppression","censorship","violation","criticism","condemnation","protest","crackdown",
  "deteriorate","worsen","escalate","aggravate","exacerbate","undermine","weaken","erode","diminish","stagnate",
  "contract","shrink","plummet","plunge","crash","tumble","slump","struggle","suffer","fail",
  "negative","pessimistic","bleak","grim","dire","hostile","aggressive","provocative","confrontational","contentious",
  "controversial","divisive","polarizing","alarming","troubling","concerning","worrisome","problematic","damaging","devastating",
  "dangerous","risky","vulnerable","fragile","volatile","turbulent","chaotic","disorder","unrest","turmoil",
]);

export function SentimentCalc() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{
    positive: number;
    negative: number;
    ratio: number;
    tone: string;
  } | null>(null);

  function analyze() {
    const words = input.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
    let pos = 0;
    let neg = 0;
    for (const w of words) {
      if (POSITIVE.has(w)) pos++;
      if (NEGATIVE.has(w)) neg++;
    }
    const total = pos + neg || 1;
    const ratio = pos / total;
    setResult({
      positive: pos,
      negative: neg,
      ratio: Math.round(ratio * 100),
      tone: ratio > 0.65 ? "偏正面" : ratio > 0.45 ? "偏中立" : "偏负面",
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
        className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none font-mono"
        placeholder="粘贴英文段落..."
      />
      <Button onClick={analyze} disabled={!input} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        <ThumbsUp className="h-3.5 w-3.5" /> 分析
      </Button>
      {result && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-[#5DAD93]/10 rounded p-2 text-center">
            <ThumbsUp className="h-4 w-4 text-[#5DAD93] mx-auto mb-1" />
            <p className="text-[#7F8A93]">正面词</p>
            <p className="font-mono font-medium text-[#5DAD93]">{result.positive}</p>
          </div>
          <div className="bg-[#E67E22]/10 rounded p-2 text-center">
            <ThumbsDown className="h-4 w-4 text-[#E67E22] mx-auto mb-1" />
            <p className="text-[#7F8A93]">负面词</p>
            <p className="font-mono font-medium text-[#E67E22]">{result.negative}</p>
          </div>
          <div className="bg-[#FAFBFC] rounded p-2 text-center">
            <p className="text-[#7F8A93]">正面比例</p>
            <p className="font-mono font-medium text-[#2D3436]">{result.ratio}%</p>
          </div>
          <div className="bg-[#FAFBFC] rounded p-2 text-center">
            <p className="text-[#7F8A93]">总体倾向</p>
            <p className="font-mono font-medium text-[#4A90A4]">{result.tone}</p>
          </div>
        </div>
      )}
      <p className="text-[10px] text-[#95A5A6]">基于内置正/负面词库（各约100词），仅供初步参考</p>
    </div>
  );
}
