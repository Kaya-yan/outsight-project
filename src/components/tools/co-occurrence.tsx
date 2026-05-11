"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GitBranch } from "lucide-react";

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "in", "to", "and", "is", "for", "on", "that",
  "was", "with", "as", "by", "at", "from", "it", "be", "are", "were",
  "been", "has", "had", "have", "its", "they", "them", "their", "this",
  "these", "those", "not", "but", "or", "we", "he", "she", "which", "who",
  "will", "would", "could", "should", "may", "more", "some", "also",
  "about", "than", "new", "other", "first", "one", "two", "can", "said",
  "so", "if", "no", "all", "an", "do", "up", "out", "into", "just", "now",
  "over", "after", "before", "between", "through", "during", "much",
  "such", "only", "still", "very", "most", "what", "when", "where",
]);

export function CoOccurrence() {
  const [input, setInput] = useState("");
  const [pairs, setPairs] = useState<[string, string, number][]>([]);

  function analyze() {
    const words = input
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    const pairCounts = new Map<string, number>();
    const windowSize = 5;

    for (let i = 0; i < words.length; i++) {
      for (let j = i + 1; j < Math.min(i + windowSize, words.length); j++) {
        const a = words[i];
        const b = words[j];
        if (a === b) continue;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }

    const sorted = [...pairCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([key, c]) => {
        const parts = key.split("|") as [string, string];
        return [parts[0], parts[1], c] as [string, string, number];
      });

    setPairs(sorted);
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
      <Button onClick={analyze} disabled={!input} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        <GitBranch className="h-3.5 w-3.5" /> 提取 TOP 20 词对
      </Button>
      {pairs.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {pairs.map(([a, b, count]) => (
            <div key={`${a}|${b}`} className="flex items-center justify-between text-xs bg-[#FAFBFC] rounded px-2 py-1">
              <span className="font-mono text-[#2D3436]">{a} — {b}</span>
              <span className="text-[#4A90A4]">{String(count)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
