"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, ChevronDown, FileText } from "lucide-react";

interface ArticleOption {
  id: string;
  title: string;
  media: string;
  period: string | null;
  word_count: number | null;
  status: string;
}

interface ArticleSelectorProps {
  value: string;           // selected article id
  onChange: (id: string) => void;
  placeholder?: string;
  className?: string;
}

export function ArticleSelector({ value, onChange, placeholder = "搜索选择文章...", className = "" }: ArticleSelectorProps) {
  const [options, setOptions] = useState<ArticleOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ArticleOption | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [isOpen]);

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "待编码");
      params.set("pageSize", "8");
      if (q) params.set("search", q);
      const res = await fetch(`/api/articles?${params}`);
      if (res.ok) {
        const json = await res.json();
        setOptions((json.data ?? []) as ArticleOption[]);
      }
    } catch {
      // silent
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, doSearch]);

  // Fetch selected article details when value changes externally
  useEffect(() => {
    if (!value) {
      setSelectedArticle(null);
      return;
    }
    // Check if already in options
    const found = options.find((o) => o.id === value);
    if (found) {
      setSelectedArticle(found);
      return;
    }
    // Fetch single article
    async function fetchOne() {
      try {
        const res = await fetch(`/api/articles/${value}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setSelectedArticle(json.data as ArticleOption);
        }
      } catch {
        // silent
      }
    }
    fetchOne();
  }, [value, options]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) doSearch(""); }}
        className="flex items-center justify-between w-full h-9 rounded border border-[#E2E5E9] bg-white px-2.5 text-xs hover:border-[#4A90A4]/50 transition-colors"
      >
        {selectedArticle ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <FileText className="h-3.5 w-3.5 text-[#4A90A4] shrink-0" />
            <span className="text-[#2D3436] truncate">{selectedArticle.title}</span>
            <span className="text-[10px] text-[#7F8A93] shrink-0">{selectedArticle.media}</span>
          </span>
        ) : (
          <span className="text-[#95A5A6]">{placeholder}</span>
        )}
        {value && (
          <X
            className="h-3.5 w-3.5 text-[#95A5A6] hover:text-[#E67E22] shrink-0 ml-1"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          />
        )}
        <ChevronDown className="h-3.5 w-3.5 text-[#95A5A6] shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full rounded border border-[#E2E5E9] bg-white shadow-lg max-h-64 overflow-hidden flex flex-col">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[#F0F2F5]">
            <Search className="h-3 w-3 text-[#95A5A6] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入标题关键词搜索..."
              className="flex-1 text-xs outline-none bg-transparent"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-[#95A5A6] p-3 text-center">搜索中...</p>
            ) : options.length === 0 ? (
              <p className="text-xs text-[#95A5A6] p-3 text-center">
                {search ? "无匹配文章" : "输入关键词搜索待编码文章"}
              </p>
            ) : (
              options.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { onChange(a.id); setSelectedArticle(a); setIsOpen(false); setSearch(""); }}
                  className={`flex items-start gap-2 w-full px-2.5 py-2 text-xs hover:bg-[#F0F2F5] transition-colors text-left ${
                    a.id === value ? "bg-[#4A90A4]/5" : ""
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 text-[#4A90A4] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[#2D3436] line-clamp-2 leading-snug">{a.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-[#7F8A93]">{a.media}</span>
                      {a.period && <span className="text-[10px] text-[#95A5A6]">{a.period}</span>}
                      {a.word_count && (
                        <span className="text-[10px] text-[#95A5A6]">{a.word_count} 词</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
