/**
 * Companion Orb — inner SVG: core glow, eye dot, state ring.
 * Outer glass styling handled by CSS on the parent div.
 */

import { memo } from "react";
import { SVG_STYLE } from "./companion-styles";
import { ORB_COLORS, type OrbState } from "./companion-config";

interface Props {
  breathingScale: number;
  eyeDimmed: boolean;
  pupilOffset: { dx: number; dy: number };
  orbState: OrbState;
}

function XiaoWaiSVGInner({ breathingScale, eyeDimmed, pupilOffset, orbState }: Props) {
  const c = ORB_COLORS[orbState];
  const cx = 28, cy = 28; // center of 56x56 viewBox
  const orbR = 22;

  const eyeX = cx + pupilOffset.dx;
  const eyeY = cy + pupilOffset.dy;

  return (
    <svg viewBox="0 0 56 56" style={{ ...SVG_STYLE, position: "absolute", inset: 0 }}>

      {/* ── breathing group ── */}
      <g style={{
        transform: `scale(${breathingScale})`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: "transform 0s",
      }}>

        {/* ── core glow radial ── */}
        <defs>
          <radialGradient id="core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c.core} stopOpacity="0.70" />
            <stop offset="50%" stopColor={c.core} stopOpacity="0.18" />
            <stop offset="100%" stopColor={c.core} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={orbR}
          fill="url(#core)"
          style={{ transition: `fill ${800}ms ease` }}
        />

        {/* ── state ring (searching: dashed + spin, completed/error: solid) ── */}
        {(orbState === "searching" || orbState === "completed" || orbState === "error") && (
          <circle cx={cx} cy={cy} r={orbR + 1}
            fill="none"
            stroke={c.ring}
            strokeWidth="0.5"
            strokeDasharray={orbState === "searching" ? "18 80" : "138 0"}
            strokeLinecap="round"
            style={{
              transition: `stroke ${800}ms ease, stroke-dasharray ${800}ms ease`,
              transformOrigin: `${cx}px ${cy}px`,
              animation: orbState === "searching" ? "ring-spin 2s linear infinite" : "none",
            }}
          />
        )}

        {/* ── eye dot (white + soft halo, visible on dark glass) ── */}
        <circle cx={eyeX} cy={eyeY} r="5"
          fill="white"
          opacity={eyeDimmed ? 0.02 : 0.08}
          style={{ transition: `opacity ${eyeDimmed ? "0.1s" : "0.3s"} ease` }}
        />
        <circle cx={eyeX} cy={eyeY} r="1.8"
          fill="white"
          opacity={eyeDimmed ? 0.12 : 0.70}
          style={{ transition: `opacity ${eyeDimmed ? "0.1s" : "0.3s"} ease` }}
        />
      </g>

      <style>{`
        @keyframes ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
