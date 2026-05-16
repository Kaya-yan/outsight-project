"use client";

import { useState, useEffect } from "react";
import { Moon, X } from "lucide-react";

const SESSION_KEY = "outsight-night-banner-dismissed";

function isNightHours(): boolean {
  const h = new Date().getHours();
  return h >= 22 || h < 6;
}

export function NightBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNightHours()) return;
    if (typeof window !== "undefined" && sessionStorage.getItem(SESSION_KEY)) return;

    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        height: 36,
        background: "rgba(15,23,42,0.85)",
        border: "1px solid rgba(56,189,248,0.2)",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "0 14px",
        animation: "nb-fade-in 0.4s ease-out",
      }}
    >
      <Moon className="h-4 w-4 text-[#fbbf24] shrink-0" />
      <span style={{ fontSize: 13, color: "rgba(226,232,240,0.9)" }}>
        🌙 深夜的编码灯，是学术路上最温柔的星光。休息也很重要哦~
      </span>
      <button
        onClick={() => {
          setVisible(false);
          sessionStorage.setItem(SESSION_KEY, "1");
        }}
        style={{
          marginLeft: "auto",
          color: "rgba(148,163,184,0.6)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 2,
          display: "flex",
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <style>{`@keyframes nb-fade-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
