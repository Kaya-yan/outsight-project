"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  href: string;
  isActive: boolean;
}

export function SidebarItem({ icon: Icon, label, href, isActive }: SidebarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Link
          href={href}
          className={cn(
            "flex flex-col items-center justify-center gap-1 h-14 w-full text-[11px] transition-colors relative rounded-md",
            isActive
              ? "text-[#5DAD93] bg-[#5DAD93]/10 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#5DAD93] before:rounded-r-sm"
              : "text-[#7F8A93] hover:text-[#FAFBFC] hover:bg-white/5",
          )}
        >
          <Icon className="h-5 w-5 shrink-0" />
          <span className="truncate">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
