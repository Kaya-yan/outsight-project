"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Hash } from "lucide-react";

interface CountResult {
  words: number;
  sentences: number;
  avgSentenceLen: number;
  uniqueWords: number;
  charsWithSpaces: number;
  charsNoSpaces: number;
}

export function WordCounter() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<CountResult | null>(null);

  function count() {
    const text = input.trim();
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    const unique = new Set(words.map((w) => w.toLowerCase()));
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;

    setResult({
      words: words.length,
      sentences: sentences.length,
      avgSentenceLen: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : words.length,
      uniqueWords: unique.size,
      charsWithSpaces,
      charsNoSpaces,
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={8}
        className="w-full rounded border border-[#E2E5E9] px-3 py-2 text-xs resize-none font-mono"
        placeholder="粘贴英文文本..."
      />
      <Button onClick={count} disabled={!input} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        <Hash className="h-3.5 w-3.5" /> 统计
      </Button>
      {result && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { label: "总词数", value: result.words },
            { label: "总句数", value: result.sentences },
            { label: "平均句长", value: result.avgSentenceLen },
            { label: "独特词汇", value: result.uniqueWords },
            { label: "字符(含空格)", value: result.charsWithSpaces },
            { label: "字符(无空格)", value: result.charsNoSpaces },
          ].map((r) => (
            <div key={r.label} className="bg-[#FAFBFC] rounded p-2 text-center">
              <p className="text-[#7F8A93]">{r.label}</p>
              <p className="font-mono font-medium text-[#2D3436]">{r.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
