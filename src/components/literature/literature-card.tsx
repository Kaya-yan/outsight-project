"use client";

import { useRouter } from "next/navigation";
import { BookOpen, Star, Eye, ThumbsUp } from "lucide-react";

interface LitCardProps {
  id: string;
  title: string;
  author: string | null;
  journal: string | null;
  publish_date: string | null;
  summary: string | null;
  rating: number | null;
  tags: string[];
  for_review: boolean;
  read_count: number;
  like_count: number;
}

export function LiteratureCard({ id, title, author, journal, publish_date, summary, rating, tags, for_review, read_count, like_count }: LitCardProps) {
  const router = useRouter();
  const stars = rating ? "★".repeat(rating) + "☆".repeat(5 - rating) : null;

  return (
    <div
      onClick={() => router.push(`/literature/${id}`)}
      className="p-4 rounded-lg border border-[#E2E5E9] bg-white hover:border-[#4A90A4]/30 hover:shadow-sm cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h3 className="text-sm font-semibold text-[#2D3436] line-clamp-2 leading-snug">{title}</h3>
        {for_review && (
          <span className="text-[10px] bg-[#E67E22]/10 text-[#E67E22] px-1.5 py-0.5 rounded shrink-0">综述用</span>
        )}
      </div>

      {(author || journal || publish_date) && (
        <p className="text-xs text-[#7F8A93] mb-1.5">
          {[author, journal, publish_date].filter(Boolean).join(" · ")}
        </p>
      )}

      {summary && (
        <p className="text-xs text-[#2D3436] line-clamp-2 leading-relaxed mb-2">{summary}</p>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] bg-[#F0F2F5] text-[#7F8A93] px-1.5 py-0.5 rounded">{t}</span>
          ))}
          {tags.length > 3 && (
            <span className="text-[10px] text-[#95A5A6]">+{tags.length - 3}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-[#95A5A6]">
          {stars && <span className="text-[#E67E22] text-[11px]">{stars}</span>}
          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{read_count}</span>
          <span className="flex items-center gap-0.5"><ThumbsUp className="h-3 w-3" />{like_count}</span>
        </div>
      </div>
    </div>
  );
}
