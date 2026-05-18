"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, ChevronDown, User } from "lucide-react";

interface Member {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  avatar_url: string | null;
  institution: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  lead_researcher: "组长",
  researcher: "研究员",
  coder: "编码员",
  viewer: "观察者",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[#E67E22]/10 text-[#E67E22]",
  lead_researcher: "bg-[#4A90A4]/10 text-[#4A90A4]",
  researcher: "bg-[#5DAD93]/10 text-[#5DAD93]",
  coder: "bg-[#7F8A93]/10 text-[#7F8A93]",
  viewer: "bg-[#95A5A6]/10 text-[#95A5A6]",
};

interface MemberSelectorProps {
  value: string;           // selected user id
  onChange: (id: string) => void;
  placeholder?: string;
  excludeId?: string;      // exclude self (e.g., when selecting coder B)
  className?: string;
}

export function MemberSelector({ value, onChange, placeholder = "选择成员...", excludeId, className = "" }: MemberSelectorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/profiles/list");
        if (res.ok) {
          const json = await res.json();
          setMembers((json.data ?? []) as Member[]);
        }
      } catch {
        // silent
      }
      setIsLoading(false);
    }
    load();
  }, []);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [isOpen]);

  const filtered = members.filter((m) => {
    if (excludeId && m.id === excludeId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.username.toLowerCase().includes(q) ||
      (m.display_name ?? "").toLowerCase().includes(q) ||
      (ROLE_LABELS[m.role] ?? m.role).includes(q)
    );
  });

  const selected = members.find((m) => m.id === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-9 rounded border border-[#E2E5E9] bg-white px-2.5 text-xs hover:border-[#4A90A4]/50 transition-colors"
      >
        {selected ? (
          <span className="flex items-center gap-1.5">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4A90A4]/10 text-[#4A90A4] text-[10px] font-medium shrink-0">
              {(selected.display_name || selected.username).charAt(0).toUpperCase()}
            </span>
            <span className="text-[#2D3436]">{selected.display_name || selected.username}</span>
            <span className={`text-[10px] px-1 rounded ${ROLE_COLORS[selected.role] ?? ""}`}>
              {ROLE_LABELS[selected.role] ?? selected.role}
            </span>
          </span>
        ) : (
          <span className="text-[#95A5A6]">{placeholder}</span>
        )}
        {value && (
          <X
            className="h-3.5 w-3.5 text-[#95A5A6] hover:text-[#E67E22] shrink-0"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          />
        )}
        <ChevronDown className="h-3.5 w-3.5 text-[#95A5A6] shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full mt-1 w-full rounded border border-[#E2E5E9] bg-white shadow-lg max-h-52 overflow-hidden flex flex-col">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-[#F0F2F5]">
            <Search className="h-3 w-3 text-[#95A5A6] shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索成员..."
              className="flex-1 text-xs outline-none bg-transparent"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto">
            {isLoading ? (
              <p className="text-xs text-[#95A5A6] p-3 text-center">加载中...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-[#95A5A6] p-3 text-center">无匹配成员</p>
            ) : (
              filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { onChange(m.id); setIsOpen(false); setSearch(""); }}
                  className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-[#F0F2F5] transition-colors ${
                    m.id === value ? "bg-[#4A90A4]/5" : ""
                  }`}
                >
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4A90A4]/10 text-[#4A90A4] text-[11px] font-medium shrink-0">
                    {(m.display_name || m.username).charAt(0).toUpperCase()}
                  </span>
                  <div className="text-left min-w-0">
                    <p className="text-[#2D3436] truncate">{m.display_name || m.username}</p>
                    <p className="text-[10px] text-[#95A5A6]">@{m.username}</p>
                  </div>
                  <span className={`text-[10px] px-1 rounded ml-auto shrink-0 ${ROLE_COLORS[m.role] ?? ""}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
