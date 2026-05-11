"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ToolCardProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  onClick: () => void;
}

export function ToolCard({ icon: Icon, title, desc, onClick }: ToolCardProps) {
  return (
    <Card
      className="border-[#E2E5E9] shadow-card hover:shadow-md hover:border-[#4A90A4]/30 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#4A90A4]/10 group-hover:bg-[#4A90A4]/20 transition-colors">
          <Icon className="h-5 w-5 text-[#4A90A4]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-[#2D3436] group-hover:text-[#4A90A4] transition-colors">
            {title}
          </h3>
          <p className="text-xs text-[#7F8A93] mt-0.5 line-clamp-2">{desc}</p>
        </div>
        <ChevronRight className="h-4 w-4 text-[#D1D5DB] group-hover:text-[#4A90A4] shrink-0 self-center transition-colors" />
      </CardContent>
    </Card>
  );
}
