"use client";

import { useState, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { Search, X, ChevronDown, Inbox } from "lucide-react";

interface Member {
  id: string;
  username: string;
  display_name: string | null;
  role: string;
  research_roles?: string[];
  avatar_url: string | null;
  institution: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员", lead_researcher: "组长", researcher: "研究员", coder: "编码员", viewer: "观察者",
};

const RESEARCH_ROLE_LABELS: Record<string, string> = {
  team_lead: "队长", reviewer: "审核员", coder: "编码员",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[#E67E22]/10 text-[#E67E22]",
  lead_researcher: "bg-[#4A90A4]/10 text-[#4A90A4]",
  researcher: "bg-[#5DAD93]/10 text-[#5DAD93]",
  coder: "bg-[#7F8A93]/10 text-[#7F8A93]",
  viewer: "bg-[#95A5A6]/10 text-[#95A5A6]",
};

interface MemberSelectorProps {
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeId?: string;
  className?: string;
  allowPool?: boolean;   // show "put in pool" option
}

export function MemberSelector({ value, onChange, placeholder = "选择成员...", excludeId, className = "", allowPool = false }: MemberSelectorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const portalId = useId().replace(/[:\s]/g, ""); // unique per instance

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const res = await fetch("/api/profiles/list");
        if (res.ok) {
          const json = await res.json();
          const list = (json.data ?? []) as Member[];
          console.log(`[MemberSelector] Loaded ${list.length} members from API`);
          setMembers(list);
        } else {
          const errJson = await res.json().catch(() => ({}));
          setLoadError(errJson.error ?? `HTTP ${res.status}`);
          console.error("[MemberSelector] API error:", res.status, errJson);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "网络错误");
        console.error("[MemberSelector] Fetch failed:", err);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function onClick(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        const portal = document.getElementById(`member-portal-${portalId}`);
        if (portal && portal.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [isOpen, portalId]);

  function updatePosition() {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
    }
  }

  function handleOpen() {
    updatePosition();
    setIsOpen(true);
  }

  function handleSelect(id: string) {
    onChange(id);
    setIsOpen(false);
    setSearch("");
  }

  const filtered = members.filter((m) => {
    if (excludeId && m.id === excludeId) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.username.toLowerCase().includes(q) ||
      (m.display_name ?? "").toLowerCase().includes(q) ||
      (ROLE_LABELS[m.role] ?? "").includes(q) ||
      (m.research_roles ?? []).some((r) => (RESEARCH_ROLE_LABELS[r] ?? r).includes(q))
    );
  });

  const selected = members.find((m) => m.id === value);
  const selectedResearchRoles = (selected?.research_roles ?? []);
  const isPoolSelected = allowPool && value === "__pool__";

  const dropdown = isOpen && (
    <div
      id={`member-portal-${portalId}`}
      className="fixed z-[9999] rounded border border-[#E2E5E9] bg-white shadow-xl max-h-56 overflow-hidden flex flex-col"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, minWidth: 280 }}
    >
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
        {/* Pool option — shown when allowPool=true and no search active */}
        {allowPool && !search && (
          <button
            type="button"
            onClick={() => handleSelect("__pool__")}
            className={`flex items-center gap-2 w-full px-2.5 py-2 text-xs hover:bg-[#F0F2F5] transition-colors border-b border-[#F0F2F5] ${
              isPoolSelected ? "bg-[#E67E22]/5" : ""
            }`}
          >
            <Inbox className="h-4 w-4 text-[#E67E22] shrink-0" />
            <div className="text-left">
              <p className="text-[#E67E22] font-medium">放入任务池</p>
              <p className="text-[10px] text-[#95A5A6]">暂不指定，任何人可认领</p>
            </div>
          </button>
        )}

        {isLoading ? (
          <p className="text-xs text-[#95A5A6] p-3 text-center">加载中...</p>
        ) : loadError ? (
          <p className="text-xs text-[#E67E22] p-3 text-center">加载失败: {loadError}</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#95A5A6] p-3 text-center">
            {search ? "无匹配成员" : `共 ${members.length} 位成员可用`}
          </p>
        ) : (
          filtered.map((m) => {
            const rRoles = (m.research_roles ?? []);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelect(m.id)}
                className={`flex items-center gap-2 w-full px-2.5 py-1.5 text-xs hover:bg-[#F0F2F5] transition-colors ${
                  m.id === value ? "bg-[#4A90A4]/5" : ""
                }`}
              >
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#4A90A4]/10 text-[#4A90A4] text-[11px] font-medium shrink-0">
                  {(m.display_name || m.username).charAt(0).toUpperCase()}
                </span>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-[#2D3436] truncate">{m.display_name || m.username}</p>
                  <p className="text-[10px] text-[#95A5A6]">@{m.username}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {rRoles.map((rr) => (
                    <span key={rr} className="text-[9px] px-1 rounded bg-[#5DAD93]/10 text-[#5DAD93]">
                      {RESEARCH_ROLE_LABELS[rr] ?? rr}
                    </span>
                  ))}
                  <span className={`text-[10px] px-1 rounded ${ROLE_COLORS[m.role] ?? ""}`}>
                    {ROLE_LABELS[m.role] ?? m.role}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="flex items-center justify-between w-full h-9 rounded border border-[#E2E5E9] bg-white px-2.5 text-xs hover:border-[#4A90A4]/50 transition-colors"
      >
        {isPoolSelected ? (
          <span className="flex items-center gap-1.5 text-[#E67E22]">
            <Inbox className="h-4 w-4" />
            <span>放入任务池</span>
          </span>
        ) : selected ? (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#4A90A4]/10 text-[#4A90A4] text-[10px] font-medium shrink-0">
              {(selected.display_name || selected.username).charAt(0).toUpperCase()}
            </span>
            <span className="text-[#2D3436] truncate">{selected.display_name || selected.username}</span>
            {selectedResearchRoles.map((rr) => (
              <span key={rr} className="text-[9px] px-1 rounded bg-[#5DAD93]/10 text-[#5DAD93] shrink-0">
                {RESEARCH_ROLE_LABELS[rr] ?? rr}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-[#95A5A6] truncate">{placeholder}</span>
        )}
        {value ? (
          <X
            className="h-3.5 w-3.5 text-[#95A5A6] hover:text-[#E67E22] shrink-0 ml-1"
            onClick={(e) => { e.stopPropagation(); onChange(""); }}
          />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[#95A5A6] shrink-0 ml-1" />
        )}
      </button>

      {isOpen && typeof document !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
