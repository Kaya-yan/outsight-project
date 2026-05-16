/**
 * XiaoWai SVG — faithful line-dog visual reconstruction.
 * Direct reference: minimal sitting dog, dot eyes, floppy ears, soft proportions.
 * Zero carryover from earlier designs.
 */

import { memo } from "react";
import { SVG_CONTAINER_STYLE } from "./companion-styles";

// === Aesthetic-critical constants (no config indirection) ===
const BODY = "#FEFCF8";
const LINE = "#3A3E42";
const LINE_W = 2.2;
const FILTER_ID = "hd";

interface Props {
  breathingScale: number;
  blinkClosed: boolean;
  pupilOffset: { dx: number; dy: number };
  isNight: boolean;
}

function XiaoWaiSVGInner({ breathingScale, blinkClosed, pupilOffset, isNight }: Props) {
  // Eye dot centers — drift with pupilOffset
  const exL = 67 + pupilOffset.dx * 0.5;
  const eyL = 76 + pupilOffset.dy * 0.4;
  const exR = 93 + pupilOffset.dx * 0.5;
  const eyR = 76 + pupilOffset.dy * 0.4;

  return (
    <svg
      viewBox="0 0 160 210"
      style={{
        ...SVG_CONTAINER_STYLE,
        transform: `scale(${breathingScale})`,
        transformOrigin: "50% 50%",
      }}
    >
      <defs>
        <filter id={FILTER_ID} x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0.45" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="bg" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor={BODY} />
          <stop offset="100%" stopColor="#F8F4EC" />
        </radialGradient>
      </defs>

      {/* ── shadow ── */}
      <ellipse cx="80" cy="200" rx="30" ry="4" fill="rgba(45,52,54,0.045)" />

      {/* ── body: sitting pose, rounded bean ── */}
      <ellipse
        cx="80" cy="148" rx="34" ry="26"
        fill="url(#bg)" stroke={LINE} strokeWidth={LINE_W}
        strokeLinecap="round" filter={`url(#${FILTER_ID})`}
      />

      {/* ── front paws ── */}
      <ellipse cx="60" cy="172" rx="8" ry="5.5"
        fill={BODY} stroke={LINE} strokeWidth={LINE_W * 0.82}
        strokeLinecap="round" filter={`url(#${FILTER_ID})`}
      />
      <ellipse cx="100" cy="172" rx="8" ry="5.5"
        fill={BODY} stroke={LINE} strokeWidth={LINE_W * 0.82}
        strokeLinecap="round" filter={`url(#${FILTER_ID})`}
      />

      {/* ── ears: floppy triangles hanging from head sides ── */}
      {/* left */}
      <path
        d="M 50 55 Q 38 60 42 40 Q 46 24 58 30 Q 64 38 60 48"
        fill={BODY} stroke={LINE} strokeWidth={LINE_W * 0.9}
        strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#${FILTER_ID})`}
      />
      {/* right */}
      <path
        d="M 110 55 Q 122 60 118 40 Q 114 24 102 30 Q 96 38 100 48"
        fill={BODY} stroke={LINE} strokeWidth={LINE_W * 0.9}
        strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#${FILTER_ID})`}
      />

      {/* ── head: the focal point, large and round ── */}
      <ellipse
        cx="80" cy="70" rx="40" ry="36"
        fill="url(#bg)" stroke={LINE} strokeWidth={LINE_W}
        strokeLinecap="round" filter={`url(#${FILTER_ID})`}
      />

      {/* ── eyebrows: tiny arcs, barely there ── */}
      <path d="M 55 56 Q 62 54 69 57" fill="none" stroke={LINE}
        strokeWidth="1" strokeLinecap="round" opacity="0.22" />
      <path d="M 91 57 Q 98 54 105 56" fill="none" stroke={LINE}
        strokeWidth="1" strokeLinecap="round" opacity="0.22" />

      {/* ── OutEye glasses: thin round frames ── */}
      <circle cx={exL} cy={eyL - 2} r="10" fill="none"
        stroke="rgba(74,144,164,0.30)" strokeWidth="1.2" />
      <circle cx={exR} cy={eyR - 2} r="10" fill="none"
        stroke="rgba(74,144,164,0.30)" strokeWidth="1.2" />
      <line x1={exL + 10} y1={eyL - 2} x2={exR - 10} y2={eyR - 2}
        stroke="rgba(74,144,164,0.30)" strokeWidth="1" />

      {/* ── eyes: two dark dots with tiny highlight ── */}
      <circle cx={exL} cy={eyL} r="3.2" fill={LINE} />
      <circle cx={exR} cy={eyR} r="3.2" fill={LINE} />
      <circle cx={exL - 0.8} cy={eyL - 1} r="1.1" fill="white" opacity="0.28" />
      <circle cx={exR - 0.8} cy={eyR - 1} r="1.1" fill="white" opacity="0.28" />

      {/* ── blink: thin lines over eyes ── */}
      <g style={{
        transform: `scaleY(${blinkClosed ? 1 : 0})`,
        transition: `transform ${blinkClosed ? "0.05s" : "0.03s"} ease`,
      }}>
        <line x1={exL - 4.5} y1={eyL} x2={exL + 4.5} y2={eyL}
          stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />
        <line x1={exR - 4.5} y1={eyR} x2={exR + 4.5} y2={eyR}
          stroke={LINE} strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* ── nose: tiny oval ── */}
      <ellipse cx="80" cy="90" rx="3.8" ry="2.8" fill="#4A4A4A" opacity="0.85" />

      {/* ── mouth: tiny relaxed arc ── */}
      <path d="M 76 95 Q 80 98 84 95" fill="none" stroke={LINE}
        strokeWidth="0.8" strokeLinecap="round" opacity="0.22" />

      {/* ── OutEye scarf: thin band around neck, tiny tail ── */}
      <path d="M 47 100 Q 80 112 113 100" fill="none"
        stroke="#4A90A4" strokeWidth="5.5" strokeLinecap="round" opacity="0.82" />
      <path d="M 47 100 Q 80 112 113 100" fill="none"
        stroke="#5DAD93" strokeWidth="1.2" strokeLinecap="round" opacity="0.45"
        transform="translate(0,-1.5)" />
      <path d="M 108 104 Q 112 120 110 136" fill="none"
        stroke="#4A90A4" strokeWidth="4.5" strokeLinecap="round" opacity="0.82" />

      {/* ── night glasses warm tint ── */}
      {isNight && (
        <>
          <circle cx={exL} cy={eyL - 2} r="10" fill="none"
            stroke="rgba(245,213,160,0.20)" strokeWidth="1.2" />
          <circle cx={exR} cy={eyR - 2} r="10" fill="none"
            stroke="rgba(245,213,160,0.20)" strokeWidth="1.2" />
        </>
      )}
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
