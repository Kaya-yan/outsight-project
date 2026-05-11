"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shuffle, Copy } from "lucide-react";

export function RandomSampler() {
  const [total, setTotal] = useState(360);
  const [sampleSize, setSampleSize] = useState(60);
  const [seed, setSeed] = useState("");
  const [results, setResults] = useState<number[]>([]);
  const [usedSeed, setUsedSeed] = useState<number | null>(null);

  function seededRandom(s: number): () => number {
    return () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function sample() {
    const actualSeed = seed ? parseInt(seed, 10) || Date.now() : Date.now();
    const rng = seededRandom(actualSeed);
    const pool = Array.from({ length: total }, (_, i) => i + 1);
    const selected: number[] = [];
    const n = Math.min(sampleSize, total);

    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * pool.length);
      selected.push(pool.splice(idx, 1)[0]);
    }
    selected.sort((a, b) => a - b);
    setResults(selected);
    setUsedSeed(actualSeed);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">总文本数</label>
          <Input type="number" min={1} value={total} onChange={(e) => setTotal(Number(e.target.value))} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">样本量</label>
          <Input type="number" min={1} max={total} value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value))} className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">随机种子（可选）</label>
          <Input type="number" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="留空随机" className="h-9 text-sm" />
        </div>
      </div>
      <Button onClick={sample} className="h-8 text-xs bg-[#4A90A4] text-white">
        <Shuffle className="h-3.5 w-3.5 mr-1" /> 抽样
      </Button>
      {usedSeed !== null && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-[#7F8A93]">
              选中 {results.length} 个 · 种子: {usedSeed}
            </p>
            <Button onClick={() => navigator.clipboard.writeText(results.join("\n"))} variant="ghost" className="h-7 text-xs">
              <Copy className="h-3 w-3 mr-1" />复制
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {results.slice(0, 50).map((n) => (
              <span key={n} className="text-xs font-mono bg-[#F0F2F5] rounded px-1.5 py-0.5">{n}</span>
            ))}
            {results.length > 50 && <span className="text-xs text-[#7F8A93]">...共 {results.length} 个</span>}
          </div>
        </div>
      )}
    </div>
  );
}
