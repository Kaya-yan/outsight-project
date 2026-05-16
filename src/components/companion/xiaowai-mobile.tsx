import { memo } from "react";

function XiaoWaiMobileInner() {
  return (
    <div
      style={{
        position: "fixed", right: 14, bottom: 14,
        width: 36, height: 36, borderRadius: "50%", opacity: 0.45,
        pointerEvents: "none", zIndex: 50,
        background: "radial-gradient(circle at 50% 50%, rgba(10,25,60,0.9) 0%, rgba(5,10,30,0.95) 100%)",
        border: "1px solid rgba(100,180,255,0.18)",
        boxShadow: "0 0 12px rgba(56,189,248,0.10)",
        overflow: "hidden",
      }}
      aria-label="Earth Orb"
    >
      <svg viewBox="0 0 56 56" width="36" height="36">
        <circle cx="28" cy="28" r="20" fill="rgba(4,12,30,0.95)" />
        <path d="M30 17 Q35 16 38 19 Q40 22 38 27 Q37 35 33 41 Q30 44 27 42 Q23 38 22 30 Q21 24 23 19 Q25 17 30 17 Z"
          fill="rgba(40,80,140,0.30)" stroke="rgba(80,160,220,0.20)" strokeWidth="0.5" />
        <path d="M33 8 Q38 6 44 8 Q48 12 49 18 Q48 24 44 28 Q40 26 38 22 Q35 18 33 16 Z"
          fill="rgba(40,80,140,0.30)" stroke="rgba(80,160,220,0.20)" strokeWidth="0.5" />
        <path d="M24 7 Q28 5 33 8 Q36 8 37 12 Q35 15 32 16 Q28 18 24 16 Q22 13 23 10 Q23 8 24 7 Z"
          fill="rgba(40,80,140,0.30)" stroke="rgba(80,160,220,0.20)" strokeWidth="0.5" />
        <circle cx="43" cy="15" r="1.2" fill="#fbbf24" opacity="0.5" />
        <circle cx="25" cy="12" r="1.2" fill="#fbbf24" opacity="0.5" />
        <circle cx="41" cy="16" r="1.2" fill="#fbbf24" opacity="0.5" />
        <circle cx="28" cy="28" r="1.5" fill="white" opacity="0.35" />
      </svg>
    </div>
  );
}

export const XiaoWaiMobile = memo(XiaoWaiMobileInner);
