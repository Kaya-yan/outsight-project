"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  Code2,
  BarChart3,
  Settings,
  Eye,
  BookOpen,
  Newspaper,
} from "lucide-react";
import { SidebarItem } from "./sidebar-item";
import { APP_VERSION } from "@/lib/constants";

const navItems = [
  { icon: LayoutDashboard, label: "控制台", href: "/dashboard" },
  { icon: FolderOpen, label: "语料", href: "/projects" },
  { icon: Newspaper, label: "国媒语料", href: "/domestic" },
  { icon: Code2, label: "编码", href: "/coding" },
  { icon: BookOpen, label: "文献", href: "/literature" },
  { icon: BarChart3, label: "统计", href: "/analytics" },
  { icon: Settings, label: "设置", href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[var(--sidebar-width)] bg-[#2D3436] flex flex-col items-center z-30 shadow-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-center h-[var(--statusbar-height)] w-full border-b border-[#3D4446] shrink-0">
        <Eye className="h-5 w-5 text-[#4A90A4]" />
      </div>

      {/* Nav Items */}
      <nav className="flex-1 w-full py-2 flex flex-col items-center gap-0">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      {/* Bottom: version */}
      <div className="pb-3">
        <span className="text-[10px] text-[#5A6570]">v{APP_VERSION}</span>
      </div>
    </aside>
  );
}
