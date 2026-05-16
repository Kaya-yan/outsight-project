/**
 * Scholarly Terminal — content renderer for the Companion Console.
 * Handles mini-bar single-line status + expanded panel with 7 data rows.
 */

import { memo, useState, useEffect } from "react";
import { STATE_LABEL, STATE_COLOR, QUOTES, PLACEHOLDER, type OrbState, TIMING } from "./companion-config";

interface Props {
  breathingScale: number;
  eyeDimmed: boolean;
  pupilOffset: { dx: number; dy: number };
  orbState: OrbState;
  expanded: boolean;
}

// ── helpers ──
function asciiBar(pct: number, color: string): string {
  const filled = Math.round((pct / 100) * 10);
  return Array.from({ length: 10 }, (_, i) => i < filled ? "█" : "░").join("");
}
function quoteOfDay(): string {
  return QUOTES[new Date().getDate() % QUOTES.length];
}
function uptime(): string {
  const s = Math.floor((performance.now?.() ?? Date.now() - Date.now()) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function XiaoWaiSVGInner({ breathingScale, eyeDimmed, orbState, expanded }: Props) {
  const c = STATE_COLOR[orbState];
  const label = STATE_LABEL[orbState];

  // Data placeholders (will be wired to real API later)
  const total = PLACEHOLDER.corpusTotal;
  const today = PLACEHOLDER.todayNew;
  const pct = PLACEHOLDER.progress;
  const pending = PLACEHOLDER.pendingJobs;
  const processing = PLACEHOLDER.processingJobs;
  const completed = PLACEHOLDER.completedToday;
  const health = PLACEHOLDER.health;
  const stability = PLACEHOLDER.stability;
  const drift = PLACEHOLDER.driftIndex;
  const driftLvl = PLACEHOLDER.driftLevel;
  const sigCnt = PLACEHOLDER.signalCount;
  const sigNames = PLACEHOLDER.signalNames;

  // Uptime (non-reactive snapshot on first render)
  const [up, setUp] = useState(uptime);
  useEffect(() => { setUp(uptime()); }, []);

  return (
    <div
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit",
        transform: expanded ? `scale(${breathingScale})` : "none",
        transformOrigin: "center center",
        transition: expanded ? "transform 0s" : "none",
      }}
    >
      {!expanded ? (
        /* ── mini bar: single line ── */
        <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
          <span style={{ color: "#38bdf8", fontWeight: 500, flexShrink: 0 }}>{">"}</span>
          <span style={{ color: "rgba(226,232,240,0.85)", flexShrink: 0 }}>
            outeye v2.0
          </span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: c, flexShrink: 0, transition: "color 800ms ease" }}>{label}</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(226,232,240,0.65)", flexShrink: 0 }}>corpus {total}</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(226,232,240,0.65)", flexShrink: 0 }}>today +{today}</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(226,232,240,0.65)", flexShrink: 0 }}>{pct}%</span>
          {/* blinking cursor */}
          <span style={{
            color: c, fontWeight: 700, marginLeft: 2,
            animation: "cursor-blink 1.5s step-end infinite",
            transition: "color 800ms ease",
          }}>▋</span>
        </div>
      ) : (
        /* ── expanded panel ── */
        <div style={{
          display: "flex", flexDirection: "column", gap: 8,
          animation: `fade-in ${TIMING.fadeIn}ms ease-out`,
          width: "100%", height: "100%", overflow: "hidden",
        }}>
          {/* L1: Welcome */}
          <div style={{ color: "rgba(226,232,240,0.85)" }}>
            <span style={{ color: "#38bdf8" }}>{">"}</span> Welcome back, yan. <span style={{ color: "#38bdf8" }}>OutEye v2.0</span>.
          </div>

          {/* L2: Status + Uptime */}
          <div style={{ color: "rgba(226,232,240,0.72)" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Status: <span style={{ color: c, transition: "color 800ms ease" }}>{label}</span>
            {" | "}Uptime: {up}
          </div>

          {/* L3: Corpus + ASCII progress bar */}
          <div style={{ color: "rgba(226,232,240,0.72)", fontFamily: "inherit" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Corpus: {total} | Today: +{today} | Progress: [
            <span style={{ color: c, transition: "color 800ms ease" }}>{asciiBar(pct, c)}</span>
            ] {pct}%
          </div>

          {/* L4: Queue */}
          <div style={{ color: "rgba(226,232,240,0.65)" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Queue: {pending} pending | {processing} processing | {completed} indexed today
          </div>

          {/* L5: Health */}
          <div style={{ color: "rgba(226,232,240,0.65)" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Health: {health}% | Stability: <span style={{ color: stability === "stable" ? "#10b981" : "#f59e0b" }}>{stability}</span> | Drift: {drift} ({driftLvl})
          </div>

          {/* L6: Research signals */}
          <div style={{ color: "rgba(226,232,240,0.65)" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Signals: {sigCnt} active · {sigNames}
          </div>

          {/* L7: Daily quote */}
          <div style={{ color: "rgba(200,215,235,0.45)", fontStyle: "italic" }}>
            {">"} &ldquo;{quoteOfDay()}&rdquo;
          </div>

          {/* L8: Micro-log (searching only, single-line replace) */}
          {orbState === "searching" && (
            <div style={{
              color: "#38bdf8", fontSize: 11,
              animation: `fade-in 200ms ease-out`,
              opacity: 0.75,
            }}>
              {">>"} crawling in progress...
            </div>
          )}

          {/* L9: Input line with blinking cursor */}
          <div style={{ marginTop: "auto", color: "rgba(226,232,240,0.85)", display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ color: "#38bdf8" }}>outeye:~$</span>
            <span style={{
              color: c, fontWeight: 700,
              animation: "cursor-blink 1.5s step-end infinite",
              transition: "color 800ms ease",
            }}>▋</span>
          </div>
        </div>
      )}

      {/* CSS keyframes injected once */}
      {expanded && <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}`}</style>}
      <style>{`@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
