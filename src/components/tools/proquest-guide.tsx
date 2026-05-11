"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Search } from "lucide-react";

export function ProQuestGuide() {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [query, setQuery] = useState("");

  function generate() {
    // Extract meaningful keywords from title (simple approach)
    const stopWords = new Set(["the", "a", "an", "of", "in", "to", "and", "is", "for", "on", "with", "as", "by", "at", "from", "or", "its", "new"]);
    const keywords = title
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    // Build boolean query
    const mainTerms = keywords.slice(0, 4).join(" AND ");
    const altTerms = keywords.slice(4, 8).map((k) => `"${k}"`).join(" OR ");

    let q = `(${mainTerms})`;
    if (altTerms) q += ` AND (${altTerms})`;
    if (author) q += ` AND AU("${author}")`;

    // ProQuest specific field codes
    const fullQuery = [
      q,
      'stype.exact("Scholarly Journals")',
      'la.exact("English")',
    ].join(" AND ");

    setQuery(fullQuery);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">文章标题</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="输入英语新闻标题" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">作者（可选）</label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="如 Smith, J." className="h-9 text-sm" />
        </div>
      </div>
      <Button onClick={generate} disabled={!title} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        <Search className="h-3.5 w-3.5" /> 生成检索式
      </Button>
      {query && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#7F8A93]">ProQuest 检索式</span>
            <Button onClick={() => navigator.clipboard.writeText(query)} variant="ghost" className="h-7 text-xs">
              <Copy className="h-3 w-3 mr-1" />复制
            </Button>
          </div>
          <div className="bg-[#FAFBFC] rounded p-3">
            <code className="text-xs text-[#2D3436] break-all">{query}</code>
          </div>
          <p className="text-[10px] text-[#95A5A6] mt-2">
            通过校园网登录 ProQuest 后，在「高级检索」中粘贴以上检索式。仅检索学术期刊英文文献。
          </p>
        </div>
      )}
    </div>
  );
}
