"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Copy, BookOpen } from "lucide-react";

type Format = "gb7714" | "apa" | "mla";

export function CitationGen() {
  const [doi, setDoi] = useState("");
  const [authors, setAuthors] = useState("");
  const [title, setTitle] = useState("");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState("");
  const [volume, setVolume] = useState("");
  const [issue, setIssue] = useState("");
  const [pages, setPages] = useState("");
  const [format, setFormat] = useState<Format>("gb7714");
  const [result, setResult] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState("");

  async function generate() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/tools/citation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doi: doi || undefined, authors, title, journal, year, volume, issue, pages }),
      });
      if (res.ok) {
        const json = await res.json();
        setResult(json.citations);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }

  function copy(formatKey: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(formatKey);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">DOI（自动获取，可选）</label>
        <Input value={doi} onChange={(e) => setDoi(e.target.value)} placeholder="10.xxxx/xxxx" className="h-9 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="作者" value={authors} onChange={setAuthors} placeholder="LastName, FN; ..." />
        <Field label="标题" value={title} onChange={setTitle} />
        <Field label="期刊/出版社" value={journal} onChange={setJournal} />
        <Field label="年份" value={year} onChange={setYear} />
        <Field label="卷" value={volume} onChange={setVolume} />
        <Field label="期" value={issue} onChange={setIssue} />
        <Field label="页码" value={pages} onChange={setPages} />
      </div>
      <Button onClick={generate} disabled={!authors || !title} className="h-8 text-xs gap-1 bg-[#4A90A4] text-white">
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookOpen className="h-3.5 w-3.5" />}
        {isLoading ? "获取中..." : "生成引文"}
      </Button>
      {result && (
        <div className="space-y-2">
          <div className="flex gap-1">
            {(["gb7714", "apa", "mla"] as Format[]).map((f) => (
              <button key={f} onClick={() => setFormat(f)} className={`px-2 py-1 rounded text-xs ${
                format === f ? "bg-[#4A90A4] text-white" : "bg-[#F0F2F5] text-[#7F8A93]"
              }`}>
                {f === "gb7714" ? "GB/T 7714" : f.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-xs text-[#2D3436] bg-[#FAFBFC] rounded p-2 leading-relaxed">
              {result[format]}
            </p>
            <Button onClick={() => copy(format, result[format])} variant="ghost" className="h-7 w-7 p-0 shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          {copied && <p className="text-[10px] text-[#5DAD93]">已复制</p>}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#7F8A93]">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 text-sm" />
    </div>
  );
}
