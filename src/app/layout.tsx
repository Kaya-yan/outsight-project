import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "OutEye 外眼 2.0 · OutSight",
  description:
    "话语研究协作平台 — 英语主流媒体话语研究的轻量化协作基础设施",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
