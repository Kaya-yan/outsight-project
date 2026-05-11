"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const labelMap: Record<string, string> = {
  dashboard: "研究控制台",
  projects: "语料工作台",
  coding: "编码实验室",
  analytics: "统计分析",
  settings: "系统设置",
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      <Link
        href="/dashboard"
        className="text-[#7F8A93] hover:text-[#4A90A4] transition-colors"
      >
        首页
      </Link>
      {segments.map((seg, i) => {
        const href = "/" + segments.slice(0, i + 1).join("/");
        const isLast = i === segments.length - 1;
        return (
          <span key={href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-[#E2E5E9]" />
            {isLast ? (
              <span className="text-[#2D3436] font-medium">
                {labelMap[seg] || seg}
              </span>
            ) : (
              <Link
                href={href}
                className="text-[#7F8A93] hover:text-[#4A90A4] transition-colors"
              >
                {labelMap[seg] || seg}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
