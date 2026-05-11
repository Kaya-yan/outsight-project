"use client";

import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuthStore, selectIsAdmin } from "@/stores/auth-store";
import { LogOut, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const roleLabelMap: Record<string, string> = {
  admin: "管理员",
  lead_researcher: "组长",
  researcher: "研究员",
  coder: "编码员",
  viewer: "观察员",
};

export function UserMenu() {
  const router = useRouter();
  const { profile, signOut } = useAuthStore();
  const isAdmin = useAuthStore(selectIsAdmin);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!profile) return null;

  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-[#F0F2F5] transition-colors"
      >
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-[#4A90A4] text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden sm:block text-left">
          <p className="text-xs font-medium text-[#2D3436] leading-tight">
            {profile.display_name || profile.username}
          </p>
          <p className="text-[10px] text-[#7F8A93] leading-tight">
            {roleLabelMap[profile.role] || profile.role}
          </p>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 rounded-md border border-[#E2E5E9] bg-white shadow-card z-50">
          <div className="px-3 py-2">
            <p className="text-sm font-medium text-[#2D3436]">
              {profile.display_name || profile.username}
            </p>
            <p className="text-xs text-[#7F8A93]">{profile.email}</p>
            <div className="mt-1">
              <Badge variant="secondary" className="text-[10px]">
                {roleLabelMap[profile.role] || profile.role}
              </Badge>
              {isAdmin && (
                <Badge className="ml-1 bg-[#E67E22] text-white text-[10px]">
                  管理员
                </Badge>
              )}
            </div>
          </div>
          <Separator />
          <div className="py-1">
            <button
                onClick={() => { router.push("/profile"); setOpen(false); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#2D3436] hover:bg-[#F0F2F5] transition-colors"
              >
                <User className="h-4 w-4" />
                个人设置
              </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[#E67E22] hover:bg-[#F0F2F5] transition-colors"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
