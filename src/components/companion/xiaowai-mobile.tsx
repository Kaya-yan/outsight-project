import { memo } from "react";

function XiaoWaiMobileInner() {
  return (
    <div
      style={{
        position: "fixed", right: 16, bottom: 16,
        width: 36, height: 36, borderRadius: "50%", opacity: 0.45,
        pointerEvents: "none", zIndex: 50,
        background: "rgba(15, 23, 42, 0.70)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      aria-label="Companion Orb"
    >
      <svg viewBox="0 0 56 56" width="28" height="28">
        <defs>
          <radialGradient id="mc" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="28" cy="28" r="20" fill="url(#mc)" />
        <circle cx="28" cy="28" r="1.5" fill="white" opacity="0.5" />
      </svg>
    </div>
  );
}

export const XiaoWaiMobile = memo(XiaoWaiMobileInner);
