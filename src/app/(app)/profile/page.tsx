"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Shield, Key, Eye, EyeOff } from "lucide-react";

const roleLabelMap: Record<string, string> = {
  admin: "管理员",
  lead_researcher: "组长",
  researcher: "研究员",
  coder: "编码员",
  viewer: "观察员",
};

export default function ProfilePage() {
  const { profile } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!profile) {
    return (
      <div className="max-w-lg py-12">
        <p className="text-sm text-[#7F8A93] text-center">未登录</p>
      </div>
    );
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!currentPassword) {
      setMessage({ type: "error", text: "请输入当前密码" });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "新密码至少需要六位字符" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "两次输入的新密码不一致" });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "密码修改成功" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: json.error ?? "密码修改失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络连接失败" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-xl font-semibold text-[#2D3436]">个人设置</h1>

      {/* Profile Info Card */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4A90A4] text-white text-lg font-semibold">
              {(profile.display_name || profile.username).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2D3436]">
                {profile.display_name || profile.username}
              </p>
              <Badge className="text-[10px]">{roleLabelMap[profile.role] ?? profile.role}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-[#7F8A93]" />
              <span className="text-[#7F8A93]">用户名：</span>
              <span className="text-[#2D3436]">{profile.username}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-[#7F8A93]" />
              <span className="text-[#7F8A93]">邮箱：</span>
              <span className="text-[#2D3436]">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-[#7F8A93]" />
              <span className="text-[#7F8A93]">角色：</span>
              <span className="text-[#2D3436]">{roleLabelMap[profile.role] ?? profile.role}</span>
            </div>
            {profile.institution && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#7F8A93]">机构：</span>
                <span className="text-[#2D3436]">{profile.institution}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="border-[#E2E5E9] shadow-card">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-[#2D3436] mb-4 flex items-center gap-2">
            <Key className="h-4 w-4 text-[#4A90A4]" />
            修改密码
          </h2>

          <form onSubmit={handleChangePassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">当前密码</Label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 pr-9 border-[#E2E5E9] text-sm"
                  placeholder="输入当前密码"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#95A5A6]"
                >
                  {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">新密码</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 pr-9 border-[#E2E5E9] text-sm"
                  placeholder="至少六位字符"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#95A5A6]"
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">确认新密码</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-9 border-[#E2E5E9] text-sm"
                placeholder="再次输入新密码"
              />
            </div>

            {message && (
              <p className={`text-xs rounded px-3 py-2 ${
                message.type === "success" ? "text-[#5DAD93] bg-[#5DAD93]/5" : "text-[#E67E22] bg-[#E67E22]/5"
              }`}>
                {message.text}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-sm w-full bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
            >
              {isSubmitting ? "修改中..." : "修改密码"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
