"use client";

import { LinguisticsPanel } from "@/components/linguistics/linguistics-panel";

export default function LinguisticsPage() {
  return (
    <div className="max-w-7xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[#2D3436]">语料分析</h1>
        <p className="mt-0.5 text-sm text-[#7F8A93]">
          英文语料库语言学分析工具 — 词频、搭配、N-grams、KWIC 索引行、文体统计
        </p>
      </div>
      <LinguisticsPanel />
    </div>
  );
}
