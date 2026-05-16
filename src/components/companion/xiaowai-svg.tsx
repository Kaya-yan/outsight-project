/**
 * XiaoWai — pure line-dog.  Single reference: reference/6.png.
 * Fill=none body, dot eyes, floppy arc ears, no accessories.
 */

import { memo } from "react";
import { SVG_CONTAINER_STYLE } from "./companion-styles";

const LINE = "#333";
const LW = 2.4;

interface Props {
  breathingScale: number;
  blinkClosed: boolean;
  pupilOffset: { dx: number; dy: number };
  isNight: boolean;
}

function XiaoWaiSVGInner({ breathingScale, blinkClosed, pupilOffset }: Props) {
  const lx = 67 + pupilOffset.dx * 0.5;
  const ly = 72 + pupilOffset.dy * 0.4;
  const rx = 93 + pupilOffset.dx * 0.5;
  const ry = 72 + pupilOffset.dy * 0.4;

  return (
    <svg
      viewBox="0 0 160 200"
      style={{
        ...SVG_CONTAINER_STYLE,
        transform: `scale(${breathingScale})`,
        transformOrigin: "50% 50%",
      }}
    >
      <defs>
        <filter id="j" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      {/* ── body: rounded sitting shape ── */}
      <ellipse cx="80" cy="144" rx="34" ry="28"
        fill="none" stroke={LINE} strokeWidth={LW}
        strokeLinecap="round" filter="url(#j)"
      />

      {/* ── front paws ── */}
      <ellipse cx="60" cy="170" rx="7" ry="5"
        fill="none" stroke={LINE} strokeWidth={LW * 0.85}
        strokeLinecap="round" filter="url(#j)"
      />
      <ellipse cx="100" cy="170" rx="7" ry="5"
        fill="none" stroke={LINE} strokeWidth={LW * 0.85}
        strokeLinecap="round" filter="url(#j)"
      />

      {/* ── ears: simple floppy arcs ── */}
      <path d="M 47 50 Q 38 62 46 78"
        fill="none" stroke={LINE} strokeWidth={LW * 0.85}
        strokeLinecap="round" filter="url(#j)"
      />
      <path d="M 113 50 Q 122 62 114 78"
        fill="none" stroke={LINE} strokeWidth={LW * 0.85}
        strokeLinecap="round" filter="url(#j)"
      />

      {/* ── head: large round, fill=none ── */}
      <ellipse cx="80" cy="66" rx="40" ry="36"
        fill="none" stroke={LINE} strokeWidth={LW}
        strokeLinecap="round" filter="url(#j)"
      />

      {/* ── eyes: two solid black dots ── */}
      <circle cx={lx} cy={ly} r="2.4" fill={LINE} />
      <circle cx={rx} cy={ry} r="2.4" fill={LINE} />

      {/* ── blink: tiny lines over eyes ── */}
      <g style={{
        transform: `scaleY(${blinkClosed ? 1 : 0})`,
        transition: `transform ${blinkClosed ? "0.04s" : "0.02s"} ease`,
      }}>
        <line x1={lx - 3.5} y1={ly} x2={lx + 3.5} y2={ly}
          stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
        <line x1={rx - 3.5} y1={ry} x2={rx + 3.5} y2={ry}
          stroke={LINE} strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* ── nose: tiny solid dot ── */}
      <circle cx="80" cy="84" r="2" fill={LINE} />

      {/* ── mouth: barely-there arc ── */}
      <path d="M 76 89 Q 80 92 84 89"
        fill="none" stroke={LINE} strokeWidth="0.8"
        strokeLinecap="round" opacity="0.3"
      />
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
