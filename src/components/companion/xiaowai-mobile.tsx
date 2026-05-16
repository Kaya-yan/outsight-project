import { memo } from "react";

function XiaoWaiMobileInner() {
  return (
    <div
      style={{
        position: "fixed", right: 16, bottom: 16,
        width: 36, height: 36, opacity: 0.50, pointerEvents: "none", zIndex: 100,
      }}
      aria-label="Companion Orb"
    >
      <svg viewBox="0 0 100 100" width="36" height="36">
        <defs>
          <radialGradient id="mo" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="36" fill="url(#mo)" stroke="rgba(255,255,255,0.10)" strokeWidth="0.8" />
        <circle cx="50" cy="50" r="22" fill="rgba(74,144,164,0.18)" />
        <circle cx="44" cy="44" r="3.5" fill="rgba(255,255,255,0.15)" />
        <circle cx="50" cy="50" r="2" fill="white" opacity="0.55" />
      </svg>
    </div>
  );
}

export const XiaoWaiMobile = memo(XiaoWaiMobileInner);
