import { memo, useState, useCallback, useEffect, useRef } from "react";
import { TerminalPanel } from "./terminal-panel";
import type { OrbState } from "./companion-config";

function XiaoWaiMobileInner() {
  const [expanded, setExpanded] = useState(false);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const panelRef = useRef<HTMLDivElement>(null);

  // System events
  useEffect(() => {
    function onState(e: Event) {
      const state = (e as CustomEvent<OrbState>).detail;
      if (state) setOrbState(state);
      if (state === "completed" || state === "error") {
        setTimeout(() => setOrbState("idle"), 4500);
      }
    }
    window.addEventListener("xw-state", onState);
    return () => window.removeEventListener("xw-state", onState);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    const t = setTimeout(() => document.addEventListener("click", onClick), 100);
    return () => { clearTimeout(t); document.removeEventListener("click", onClick); };
  }, [expanded]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  if (expanded) {
    return (
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          height: "60vh",
          zIndex: 50,
          background: "rgba(15, 23, 42, 0.97)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(56, 189, 248, 0.2)",
          fontFamily: "'JetBrains Mono','Fira Code',Consolas,monospace",
          fontSize: 12,
          lineHeight: 1.5,
          color: "rgba(226, 232, 240, 0.85)",
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          animation: "mobile-panel-up 300ms ease-out",
        }}
      >
        <TerminalPanel orbState={orbState} onClose={handleClose} />
        <style>{`@keyframes mobile-panel-up{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
      </div>
    );
  }

  return (
    <div
      onClick={handleToggle}
      style={{
        position: "fixed", right: 14, bottom: 14,
        height: 36, width: 200,
        zIndex: 50,
        cursor: "pointer",
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
