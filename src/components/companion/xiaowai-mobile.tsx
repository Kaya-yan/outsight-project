import { memo } from "react";

function XiaoWaiMobileInner() {
  return (
    <div
      style={{
        position: "fixed", right: 14, bottom: 14,
        height: 36, width: 200, opacity: 0.5,
        pointerEvents: "none", zIndex: 50,
        background: "rgba(15,23,42,0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(56,189,248,0.10)",
        borderRadius: 6,
        fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
        fontSize: 10, lineHeight: "36px",
        color: "rgba(226,232,240,0.70)",
        padding: "0 10px",
        display: "flex", alignItems: "center", gap: 5,
        overflow: "hidden", whiteSpace: "nowrap",
      }}
      aria-label="Scholarly Terminal"
    >
      <span style={{ color:"#38bdf8" }}>{">"}</span>
      <span>outeye v2.0 · standby</span>
      <span style={{ color:"#38bdf8", fontWeight:700 }}>▋</span>
    </div>
  );
}

export const XiaoWaiMobile = memo(XiaoWaiMobileInner);
