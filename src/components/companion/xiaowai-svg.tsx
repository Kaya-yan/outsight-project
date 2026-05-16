/**
 * Night Earth Orb — holographic globe for OutEye global news theme.
 * Simplified continent paths, city lights, rotating grid, state-driven visuals.
 */

import { memo } from "react";
import { SVG_STYLE } from "./companion-styles";
import { STATE_COLORS, TIMING, type OrbState } from "./companion-config";

interface Props {
  breathingScale: number;
  eyeDimmed: boolean;
  pupilOffset: { dx: number; dy: number };
  orbState: OrbState;
  expanded: "hover" | "click" | null;
}

// ── city positions (x,y in 56×56 viewBox, center 28,28, r≈20, center-lng≈15°E) ──
const CITIES = [
  { x:43,y:15, name:"Beijing" },
  { x:13,y:15, name:"New York" },
  { x:25,y:12, name:"London" },
  { x:41,y:16, name:"Tokyo" },
  { x:40,y:39, name:"Sydney" },
  { x:33,y:18, name:"Cairo" },
  { x:12,y:36, name:"Rio" },
  { x:25,y:13, name:"Paris" },
  { x:32,y:11, name:"Moscow" },
  { x:40,y:20, name:"Dubai" },
];

const CITIES_SECONDARY = [
  { x:45,y:18, name:"Shanghai" },
  { x:16,y:17, name:"Los Angeles" },
  { x:44,y:22, name:"Mumbai" },
  { x:12,y:36, name:"São Paulo" },
  { x:28,y:12, name:"Berlin" },
  { x:46,y:28, name:"Singapore" },
  { x:14,y:14, name:"Toronto" },
  { x:32,y:15, name:"Istanbul" },
  { x:43,y:16, name:"Seoul" },
  { x:32,y:37, name:"Joburg" },
];

// ── simplified continent paths (56×56 viewBox, orthographic approx, center-lng 15°E) ──
const AFRICA = "M30 17 Q35 16 38 19 Q40 22 38 27 Q37 35 33 41 Q30 44 27 42 Q23 38 22 30 Q21 24 23 19 Q25 17 30 17 Z";
const EUROPE = "M24 7 Q28 5 33 8 Q36 8 37 12 Q35 15 32 16 Q28 18 24 16 Q22 13 23 10 Q23 8 24 7 Z";
const ASIA = "M33 8 Q38 6 44 8 Q48 12 49 18 Q48 24 44 28 Q40 26 38 22 Q35 18 33 16 Z";
const N_AMERICA = "M10 8 Q16 5 20 8 Q24 12 22 18 Q18 22 14 20 Q10 18 8 14 Q8 10 10 8 Z";
const S_AMERICA = "M14 30 Q18 28 21 32 Q22 40 18 44 Q14 46 12 42 Q10 36 14 30 Z";
const AUSTRALIA = "M42 34 Q46 33 48 36 Q48 40 44 42 Q40 40 42 34 Z";
const ANTARCTICA = "M18 50 Q28 48 38 50 Q48 52 50 54 Q28 56 6 54 Q10 52 18 50 Z";

function XiaoWaiSVGInner({ breathingScale, eyeDimmed, pupilOffset, orbState, expanded }: Props) {
  const sc = STATE_COLORS[orbState];
  const cx = 28, cy = 28, R = 20;

  // Rotation speed depends on state
  const rotSpeed = orbState === "searching" ? TIMING.rotationSearch
    : orbState === "waiting" ? TIMING.rotationWait
    : TIMING.rotationIdle;

  // City light opacity: idle breathes, searching stays bright, waiting dim
  const cityBase = orbState === "waiting" ? 0.2 : orbState === "searching" ? 1 : 0.65;
  const cityColor = orbState === "completed" ? "#22c55e" : orbState === "error" ? "#f97316" : "#fbbf24";

  return (
    <svg viewBox="0 0 56 56" style={SVG_STYLE}>

      {/* ── breathing + state-driven wrapper ── */}
      <g style={{
        transform: `scale(${breathingScale})`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: "transform 0s",
      }}>

        {/* ── ocean base ── */}
        <circle cx={cx} cy={cy} r={R}
          fill="rgba(4, 12, 30, 0.95)"
        />

        {/* ── rotating grid group ── */}
        <g style={{
          transformOrigin: `${cx}px ${cy}px`,
          animation: `earth-spin ${rotSpeed}s linear infinite`,
        }}>
          {/* Equator */}
          <line x1={cx - R} y1={cy} x2={cx + R} y2={cy}
            stroke="rgba(200,220,255,0.12)" strokeWidth="0.3" />
          {/* Parallels */}
          <line x1={cx - 17} y1={cy - 10} x2={cx + 17} y2={cy - 10}
            stroke="rgba(200,220,255,0.1)" strokeWidth="0.3" />
          <line x1={cx - 10} y1={cy - 17} x2={cx + 10} y2={cy - 17}
            stroke="rgba(200,220,255,0.08)" strokeWidth="0.3" />
          <line x1={cx - 17} y1={cy + 10} x2={cx + 17} y2={cy + 10}
            stroke="rgba(200,220,255,0.1)" strokeWidth="0.3" />
          <line x1={cx - 10} y1={cy + 17} x2={cx + 10} y2={cy + 17}
            stroke="rgba(200,220,255,0.08)" strokeWidth="0.3" />
          {/* Meridians (ellipses) */}
          <ellipse cx={cx} cy={cy} rx="8" ry={R} fill="none"
            stroke="rgba(200,220,255,0.1)" strokeWidth="0.3" />
          <ellipse cx={cx} cy={cy} rx="15" ry={R} fill="none"
            stroke="rgba(200,220,255,0.08)" strokeWidth="0.3" />
          {/* Prime meridian */}
          <line x1={cx} y1={cy - R} x2={cx} y2={cy + R}
            stroke="rgba(200,220,255,0.12)" strokeWidth="0.3" />
        </g>

        {/* ── continent paths (fixed, not rotating) ── */}
        <g style={{ transition: `fill ${800}ms ease, stroke ${800}ms ease` }}>
          {[
            { d: AFRICA, name: "Africa" },
            { d: EUROPE, name: "Europe" },
            { d: ASIA, name: "Asia" },
            { d: N_AMERICA, name: "N.America" },
            { d: S_AMERICA, name: "S.America" },
            { d: AUSTRALIA, name: "Australia" },
            { d: ANTARCTICA, name: "Antarctica" },
          ].map((c) => (
            <path key={c.name} d={c.d}
              fill={sc.continent} stroke={sc.outline} strokeWidth="0.5"
              strokeLinejoin="round"
            />
          ))}
        </g>

        {/* ── city light dots (primary) ── */}
        {CITIES.map((c) => (
          <g key={c.name}>
            {/* Glow halo */}
            <circle cx={c.x} cy={c.y} r="3"
              fill={cityColor} opacity={cityBase * 0.25}
              style={{ transition: "fill 800ms ease" }}
            />
            {/* Core dot */}
            <circle cx={c.x} cy={c.y} r="1.8"
              fill={cityColor} opacity={cityBase}
              style={{ transition: "fill 800ms ease" }}
            />
            {/* Label on hover/click */}
            {expanded && (
              <text x={c.x} y={c.y - 3} textAnchor="middle"
                fill="rgba(255,255,255,0.7)" fontSize={expanded === "click" ? "3.5" : "2.5"}
                style={{ pointerEvents: "none" }}
              >{c.name}</text>
            )}
          </g>
        ))}

        {/* ── secondary cities (hover/click only) ── */}
        {expanded && CITIES_SECONDARY.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r="2.5" fill={cityColor} opacity={cityBase * 0.2} />
            <circle cx={c.x} cy={c.y} r="1.4" fill={cityColor} opacity={cityBase * 0.8} />
            <text x={c.x} y={c.y - 2.5} textAnchor="middle"
              fill="rgba(255,255,255,0.65)" fontSize={expanded === "click" ? "3" : "2"}
              style={{ pointerEvents: "none" }}
            >{c.name}</text>
          </g>
        ))}

        {/* ── continent labels (click only) ── */}
        {expanded === "click" && (
          <g fill="rgba(200,220,255,0.40)" fontSize="3" textAnchor="middle" style={{ pointerEvents: "none" }}>
            <text x="31" y="28">Africa</text>
            <text x="26" y="9">Europe</text>
            <text x="42" y="14">Asia</text>
            <text x="14" y="12">N.America</text>
            <text x="14" y="38">S.America</text>
            <text x="44" y="38">Australia</text>
          </g>
        )}

        {/* ── ocean labels (click only) ── */}
        {expanded === "click" && (
          <g fill="rgba(150,200,230,0.30)" fontSize="3" textAnchor="middle" style={{ pointerEvents: "none" }}>
            <text x="18" y="20">Atlantic</text>
            <text x="40" y="22">Pacific</text>
            <text x="32" y="36">Indian</text>
            <text x="28" y="52">Southern</text>
          </g>
        )}

        {/* ── atmosphere edge glow ── */}
        <circle cx={cx} cy={cy} r={R + 1}
          fill="none" stroke="rgba(100,180,255,0.12)" strokeWidth="1.5"
        />

        {/* ── state scanning ring (searching only) ── */}
        {orbState === "searching" && (
          <circle cx={cx} cy={cy} r={R + 5}
            fill="none" stroke={sc.scan} strokeWidth="0.5"
            strokeDasharray="10 90" strokeLinecap="round"
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: "scan-spin 3s linear infinite",
            }}
          />
        )}

        {/* ── completed: equator pulse (green) ── */}
        {orbState === "completed" && (
          <line x1={cx - R} y1={cy} x2={cx + R} y2={cy}
            stroke="rgba(34,197,94,0.5)" strokeWidth="0.8"
            style={{
              animation: "pulse-line 0.8s ease-out 1",
            }}
          />
        )}

        {/* ── eye dot (white point + soft halo) ── */}
        <circle cx={28 + (pupilOffset?.dx ?? 0)} cy={28 + (pupilOffset?.dy ?? 0)} r="4"
          fill="white" opacity={eyeDimmed ? 0.02 : 0.06}
          style={{ transition: `opacity ${eyeDimmed ? "0.1s" : "0.3s"} ease` }}
        />
        <circle cx={28 + (pupilOffset?.dx ?? 0)} cy={28 + (pupilOffset?.dy ?? 0)} r="1.5"
          fill="white" opacity={eyeDimmed ? 0.1 : 0.6}
          style={{ transition: `opacity ${eyeDimmed ? "0.1s" : "0.3s"} ease` }}
        />
      </g>

      <style>{`
        @keyframes earth-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes scan-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse-line  { 0%{opacity:0.8} 50%{opacity:1;stroke-width:2} 100%{opacity:0;stroke-width:0.3} }
      `}</style>
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
