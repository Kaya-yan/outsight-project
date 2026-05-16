/**
 * Companion Orb — minimalist AI presence.
 * Glass sphere, breathing glow, subtle eye, state-aware ring.
 */

import { memo } from "react";
import { SVG_STYLE } from "./companion-styles";
import { ORB_COLORS, type OrbState } from "./companion-config";

interface Props {
  breathingScale: number;
  /** Eye dimming (replaces "blink" — eye briefly fades) */
  eyeDimmed: boolean;
  /** Eye dot offset from cursor tracking */
  pupilOffset: { dx: number; dy: number };
  orbState: OrbState;
}

function XiaoWaiSVGInner({ breathingScale, eyeDimmed, pupilOffset, orbState }: Props) {
  const c = ORB_COLORS[orbState];
  const cx = 60, cy = 62; // orb center in 120x120 viewBox
  const orbR = 28;        // main sphere radius

  // Eye dot position: center of orb + offset, clamped within sphere
  const eyeX = cx + pupilOffset.dx;
  const eyeY = cy + pupilOffset.dy;

  return (
    <svg viewBox="0 0 120 120" style={SVG_STYLE}>

      {/* ── breathing + state-driven wrapper ── */}
      <g style={{
        transform: `scale(${breathingScale})`,
        transformOrigin: `${cx}px ${cy}px`,
        transition: "transform 0s",
      }}>

        {/* ── outer glow halo ── */}
        <circle cx={cx} cy={cy} r={orbR + 12}
          fill="none"
          stroke={c.glow} strokeWidth="8"
          opacity={0.6}
          style={{ transition: `stroke ${800}ms ease` }}
        />
        <circle cx={cx} cy={cy} r={orbR + 20}
          fill="none"
          stroke={c.glow} strokeWidth="16"
          opacity={0.25}
          style={{ transition: `stroke ${800}ms ease` }}
        />

        {/* ── state ring (searching / completed / error) ── */}
        {(orbState === "searching" || orbState === "completed" || orbState === "error") && (
          <circle cx={cx} cy={cy} r={orbR + 6}
            fill="none"
            stroke={c.ring} strokeWidth="1.5"
            strokeDasharray={orbState === "searching" ? "40 160" : "180 0"}
            strokeLinecap="round"
            opacity={orbState === "searching" ? 1 : 0.7}
            style={{
              transition: `stroke ${800}ms ease, stroke-dasharray ${800}ms ease`,
              transformOrigin: `${cx}px ${cy}px`,
              animation: orbState === "searching" ? "orb-spin 3s linear infinite" : "none",
            }}
          />
        )}

        {/* ── main sphere body ── */}
        <defs>
          <radialGradient id="orb-body" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="40%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.12)" />
          </radialGradient>
          <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={c.core} stopOpacity="0.55" />
            <stop offset="100%" stopColor={c.core} stopOpacity="0.08" />
          </radialGradient>
        </defs>

        {/* Sphere glass surface */}
        <circle cx={cx} cy={cy} r={orbR}
          fill="url(#orb-body)"
          stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"
        />

        {/* Inner core glow */}
        <circle cx={cx} cy={cy} r={orbR - 6}
          fill="url(#orb-core)"
          style={{ transition: `fill ${800}ms ease` }}
        />

        {/* Core highlight — tiny bright spot */}
        <circle cx={cx - 8} cy={cy - 10} r="5"
          fill="rgba(255,255,255,0.10)"
        />

        {/* ── eye dot — tiny luminous point that follows cursor ── */}
        <circle
          cx={eyeX} cy={eyeY} r="2.5"
          fill="white"
          opacity={eyeDimmed ? 0.15 : 0.65}
          style={{
            transition: `opacity ${eyeDimmed ? "0.1s" : "0.3s"} ease`,
          }}
        />
        {/* Eye soft halo */}
        <circle
          cx={eyeX} cy={eyeY} r="7"
          fill="white"
          opacity={eyeDimmed ? 0.02 : 0.08}
          style={{ transition: `opacity ${eyeDimmed ? "0.1s" : "0.3s"} ease` }}
        />

        {/* ── subtle ring highlight on sphere edge ── */}
        <circle cx={cx} cy={cy} r={orbR - 1}
          fill="none"
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"
          strokeDasharray="60 120" strokeLinecap="round"
        />
      </g>

      {/* ── CSS keyframes for scanning ring ── */}
      <style>{`
        @keyframes orb-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
