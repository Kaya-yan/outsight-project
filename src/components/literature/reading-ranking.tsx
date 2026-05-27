"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Award, BookOpen } from "lucide-react";

interface RankUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  read_count: number;
}

const PERIOD_OPTIONS = [
  { value: "week", label: "本周" },
  { value: "month", label: "本月" },
  { value: "all", label: "全部" },
] as const;

const RANK_COLORS = {
  0: { bg: "bg-[#FFD700]/10", border: "border-[#FFD700]/30", badge: "bg-[#FFD700]", text: "text-[#B8860B]", bar: "bg-[#FFD700]" },
  1: { bg: "bg-[#C0C0C0]/10", border: "border-[#C0C0C0]/30", badge: "bg-[#C0C0C0]", text: "text-[#808080]", bar: "bg-[#C0C0C0]" },
  2: { bg: "bg-[#CD7F32]/10", border: "border-[#CD7F32]/30", badge: "bg-[#CD7F32]", text: "text-[#8B4513]", bar: "bg-[#CD7F32]" },
};

const DEFAULT_BAR = "bg-[#4A90A4]";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 0) return <Trophy className="h-4 w-4 text-[#FFD700]" />;
  if (rank === 1) return <Medal className="h-4 w-4 text-[#C0C0C0]" />;
  if (rank === 2) return <Award className="h-4 w-4 text-[#CD7F32]" />;
  return <span className="text-xs text-[#7F8A93] font-mono w-4 text-center">{rank + 1}</span>;
}

export function ReadingRanking() {
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const [rankings, setRankings] = useState<RankUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadRankings = useCallback(async () => {
    try {
      const res = await fetch(`/api/literature/reading-rank?period=${period}`);
      if (res.ok) {
        const json = await res.json();
        setRankings(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setIsLoading(true);
    loadRankings();
  }, [loadRankings]);

  // Poll every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadRankings, 30000);
    return () => clearInterval(interval);
  }, [loadRankings]);

  const maxCount = rankings[0]?.read_count ?? 1;

  return (
    <div className="bg-white rounded-lg border border-[#E2E5E9] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-[#4A90A4]" />
          <h3 className="text-sm font-semibold text-[#2D3436]">📚 团队阅读排行榜</h3>
        </div>
        <div className="flex items-center gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                period === opt.value
                  ? "bg-[#4A90A4] text-white"
                  : "text-[#7F8A93] hover:bg-[#F0F2F5]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <p className="text-sm text-[#7F8A93] py-6 text-center">加载中...</p>
      ) : rankings.length === 0 ? (
        <div className="py-6 text-center">
          <Trophy className="h-8 w-8 text-[#95A5A6] mx-auto mb-2" />
          <p className="text-sm text-[#7F8A93]">暂无阅读数据</p>
        </div>
      ) : (
        <>
          {/* Desktop: horizontal bar ranking */}
          <div className="hidden md:block space-y-3">
            {rankings.map((user, idx) => {
              const colors = RANK_COLORS[idx as keyof typeof RANK_COLORS];
              const isTop3 = idx < 3;
              const percentage = (user.read_count / maxCount) * 100;

              return (
                <div
                  key={user.user_id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isTop3
                      ? `${colors.bg} ${colors.border}`
                      : "border-transparent hover:bg-[#F0F2F5]/50"
                  }`}
                >
                  {/* Rank badge */}
                  <div className="flex-shrink-0 w-6 flex justify-center">
                    <RankBadge rank={idx} />
                  </div>

                  {/* Avatar */}
                  <Avatar className={`flex-shrink-0 ${isTop3 ? "h-10 w-10" : "h-8 w-8"}`}>
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className={`${isTop3 ? "text-sm" : "text-xs"} bg-[#4A90A4]/10 text-[#4A90A4]`}>
                      {getInitials(user.display_name ?? user.username)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name */}
                  <div className="flex-shrink-0 w-24">
                    <p className={`font-medium truncate ${isTop3 ? "text-sm" : "text-xs"} text-[#2D3436]`}>
                      {user.display_name ?? user.username}
                    </p>
                    {isTop3 && user.display_name && (
                      <p className="text-[10px] text-[#7F8A93] truncate">@{user.username}</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex-1 h-6 bg-[#F0F2F5] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isTop3 ? colors.bar : DEFAULT_BAR}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* Count */}
                  <div className="flex-shrink-0 w-16 text-right">
                    <span className={`font-mono font-semibold ${isTop3 ? "text-base" : "text-sm"} ${isTop3 ? colors.text : "text-[#2D3436]"}`}>
                      {user.read_count}
                    </span>
                    <span className="text-[10px] text-[#7F8A93] ml-0.5">篇</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: vertical compact list */}
          <div className="md:hidden space-y-2">
            {rankings.map((user, idx) => {
              const colors = RANK_COLORS[idx as keyof typeof RANK_COLORS];
              const isTop3 = idx < 3;

              return (
                <div
                  key={user.user_id}
                  className={`flex items-center gap-2 p-2 rounded ${
                    isTop3 ? `${colors.bg} border ${colors.border}` : "border border-transparent"
                  }`}
                >
                  <RankBadge rank={idx} />
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={user.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[10px] bg-[#4A90A4]/10 text-[#4A90A4]">
                      {getInitials(user.display_name ?? user.username)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-xs text-[#2D3436] truncate">
                    {user.display_name ?? user.username}
                  </span>
                  <span className={`text-xs font-mono font-semibold ${isTop3 ? colors.text : "text-[#2D3436]"}`}>
                    {user.read_count}篇
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
