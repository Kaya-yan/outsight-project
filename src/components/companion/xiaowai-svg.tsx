/**
 * Scholarly Terminal — real data from dashboard store, live uptime, daily CN encouragement.
 */

import { memo, useState, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";
import { STATE_LABEL, STATE_COLOR, QUOTES, CN_QUOTES, type OrbState, TIMING } from "./companion-config";

interface Props {
  breathingScale: number;
  eyeDimmed: boolean;
  pupilOffset: { dx: number; dy: number };
  orbState: OrbState;
  expanded: boolean;
}

function quoteOfDay() { return QUOTES[new Date().getDate() % QUOTES.length]; }
function cnQuoteOfDay() { return CN_QUOTES[new Date().getDate() % CN_QUOTES.length]; }

function XiaoWaiSVGInner({ breathingScale, eyeDimmed, orbState, expanded }: Props) {
  const c = STATE_COLOR[orbState];
  const label = STATE_LABEL[orbState];
  const { stats } = useDashboardStore();

  // Real data from dashboard
  const total = stats?.totalArticles ?? 0;
  // Approximate today new from recent articles
  const todayNew = stats?.recentArticles?.filter(
    (a) => a.created_at?.startsWith(new Date().toISOString().split("T")[0])
  ).length ?? 0;
  const queuePending = 0;
  const queueProcessing = 0;

  // Live uptime counter
  const [up, setUp] = useState("");
  useEffect(() => {
    const t0 = performance.now();
    function tick() {
      const s = Math.floor((performance.now() - t0) / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      setUp(`${d}d ${h}h ${m}m`);
    }
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, []);

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
        <div style={{ display: "flex", alignItems: "center", gap: 6, width: "100%" }}>
          <span style={{ color: "#38bdf8", fontWeight: 500, flexShrink: 0 }}>{">"}</span>
          <span style={{ color: "rgba(226,232,240,0.85)", flexShrink: 0 }}>outeye v2.0</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: c, flexShrink: 0, transition: "color 800ms ease" }}>{label}</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(226,232,240,0.65)", flexShrink: 0 }}>corpus {total}</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(226,232,240,0.65)", flexShrink: 0 }}>today +{todayNew}</span>
          <span style={{ color: "rgba(148,163,184,0.5)", flexShrink: 0 }}>·</span>
          <span style={{ color: "rgba(226,232,240,0.65)", flexShrink: 0 }}>{cnQuoteOfDay()}</span>
          <span style={{
            color: c, fontWeight: 700, marginLeft: 2,
            animation: "cursor-blink 1.5s step-end infinite",
            transition: "color 800ms ease",
          }}>▋</span>
        </div>
      ) : (
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
            {" | "}Uptime: {up || "0h 0m"}
          </div>

          {/* L3: Corpus + today */}
          <div style={{ color: "rgba(226,232,240,0.72)" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Corpus: {total} | Today: +{todayNew}
          </div>

          {/* L4: Queue */}
          <div style={{ color: "rgba(226,232,240,0.65)" }}>
            <span style={{ color: "#94a3b8" }}>{">"}</span> Queue: {queuePending} pending | {queueProcessing} processing
          </div>

          {/* L5: Daily encouragement */}
          <div style={{ color: "rgba(200,215,235,0.50)", fontStyle: "italic" }}>
            {">"} &ldquo;{quoteOfDay()}&rdquo;
          </div>

          {/* L6: Chinese encouragement */}
          <div style={{ color: "rgba(180,205,230,0.45)" }}>
            {">"} {cnQuoteOfDay()}
          </div>

          {/* L7: Micro-log (searching only) */}
          {orbState === "searching" && (
            <div style={{ color: "#38bdf8", fontSize: 11, animation: `fade-in 200ms ease-out`, opacity: 0.75 }}>
              {">>"} crawling in progress...
            </div>
          )}

          {/* L8: Input line */}
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

      {expanded && <style>{`@keyframes fade-in{from{opacity:0}to{opacity:1}}`}</style>}
      <style>{`@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
