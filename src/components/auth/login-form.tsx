"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { DailyQuote } from "./daily-quote";
import { AcademicDisclaimer } from "./academic-disclaimer";
import { Eye } from "lucide-react";

type FormState = "idle" | "logging_in" | "error";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isUsernameValid = username.trim().length >= 2;
  const isPasswordValid = password.length >= 6;
  const canSubmit = isEmailValid && isUsernameValid && isPasswordValid && formState !== "logging_in";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setFormState("logging_in");
    setErrorMessage("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push("/dashboard");
      } else {
        setErrorMessage(data.error || "登录失败，请重试");
        setFormState("error");
      }
    } catch {
      setErrorMessage("网络连接失败，请检查网络后重试");
      setFormState("error");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFBFC] px-4 py-12">
      <Card className="w-full max-w-md border-[#E2E5E9] shadow-card">
        <CardContent className="pt-8 pb-6 px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Eye className="h-7 w-7 text-[#4A90A4]" />
              <h1 className="text-xl font-semibold tracking-tight text-[#2D3436]">
                外眼 2.0
              </h1>
            </div>
            <p className="text-sm text-[#7F8A93]">话语研究协作平台</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm text-[#2D3436]">
                用户名
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="输入您的用户名"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (formState === "error") setFormState("idle");
                }}
                className="h-10 border-[#E2E5E9] focus-visible:ring-[#4A90A4]"
                autoComplete="username"
                disabled={formState === "logging_in"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-[#2D3436]">
                邮箱
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formState === "error") setFormState("idle");
                }}
                className="h-10 border-[#E2E5E9] focus-visible:ring-[#4A90A4]"
                autoComplete="email"
                disabled={formState === "logging_in"}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-[#2D3436]">
                密码
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="输入您的密码（至少六位）"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (formState === "error") setFormState("idle");
                }}
                className="h-10 border-[#E2E5E9] focus-visible:ring-[#4A90A4]"
                autoComplete="current-password"
                disabled={formState === "logging_in"}
              />
            </div>

            {formState === "error" && errorMessage && (
              <p className="rounded-md bg-[#E67E22]/5 px-3 py-2 text-sm text-[#E67E22]">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              className="h-10 w-full bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
              disabled={!canSubmit}
            >
              {formState === "logging_in" ? "登录中..." : "登录"}
            </Button>

            <p className="text-xs text-center text-[#95A5A6]">
              首次登录自动创建账号，已有账号直接登录
            </p>
          </form>

          <Separator className="my-4" />

          <DailyQuote />

          <Separator className="my-4" />

          <AcademicDisclaimer />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-[#95A5A6]">
        OutSight v0.1.0
      </p>
    </div>
  );
}
