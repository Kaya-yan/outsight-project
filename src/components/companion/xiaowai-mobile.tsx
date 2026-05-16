"use client";

/** Phase 1: Mobile fallback — static icon, zero animation, zero JS overhead beyond render. */

import { memo } from "react";
import { COLORS, VIEWBOX } from "./companion-config";

function XiaoWaiMobileInner() {
  const b = COLORS;
  const s = 48; // display size in px

  return (
    <div
      style={{
        position: "fixed",
        right: 16,
        bottom: 16,
        width: s,
        height: s,
        opacity: 0.6,
        pointerEvents: "none",
        zIndex: 100,
      }}
      aria-label="XiaoWai"
    >
      <svg viewBox="0 0 60 60" width={s} height={s}>
        {/* Simplified head */}
        <ellipse cx="30" cy="28" rx="18" ry="16" fill={b.body} stroke={b.outline} strokeWidth="2" />
        {/* Ears */}
        <path d="M18 22 Q12 16 16 10 Q22 8 24 18 Z" fill={b.body} stroke={b.outline} strokeWidth="1.8" />
        <path d="M42 22 Q48 16 44 10 Q38 8 36 18 Z" fill={b.body} stroke={b.outline} strokeWidth="1.8" />
        {/* Eyes (closed — calm) */}
        <path d="M23 27 Q26 24 29 27" fill="none" stroke={b.outline} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M31 27 Q34 24 37 27" fill="none" stroke={b.outline} strokeWidth="1.5" strokeLinecap="round" />
        {/* Nose */}
        <polygon points="30,33 28,36 32,36" fill={b.nose} />
        {/* Glasses hint */}
        <circle cx="26" cy="27" r="6" fill="none" stroke={b.glasses} strokeWidth="1" />
        <circle cx="34" cy="27" r="6" fill="none" stroke={b.glasses} strokeWidth="1" />
        {/* Scarf hint */}
        <path d="M16 38 Q30 44 44 38" fill="none" stroke={b.scarf} strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export const XiaoWaiMobile = memo(XiaoWaiMobileInner);
