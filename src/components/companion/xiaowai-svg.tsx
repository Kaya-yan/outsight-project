/** Phase 1 · Visual Rebuild: Line-dog inspired minimalist character. */

import { memo } from "react";
import { HAND_DRAWN_FILTER_ID, SVG_CONTAINER_STYLE } from "./companion-styles";

// Direct color constants — no indirection for aesthetic-critical values
const BODY = "#FAF8F5";
const OUTLINE = "#3D4446";
const GLASSES = "rgba(74,144,164,0.28)";
const SCARF = "#4A90A4";
const SCARF_STRIPE = "#5DAD93";
const NOSE = "#4A4A4A";
const SHADOW = "rgba(45,52,54,0.04)";

interface XiaoWaiSVGProps {
  breathingScale: number;
  blinkClosed: boolean;
  pupilOffset: { dx: number; dy: number };
  isNight: boolean;
}

function XiaoWaiSVGInner({ breathingScale, blinkClosed, pupilOffset, isNight }: XiaoWaiSVGProps) {
  // Eyes center: two dots that shift gently with pupilOffset
  const lx = 84 + pupilOffset.dx * 0.5;
  const ly = 76 + pupilOffset.dy * 0.5;
  const rx = 116 + pupilOffset.dx * 0.5;
  const ry = 76 + pupilOffset.dy * 0.5;

  return (
    <svg
      viewBox="0 0 200 200"
      style={{
        ...SVG_CONTAINER_STYLE,
        transform: `scale(${breathingScale})`,
        transformOrigin: "center center",
      }}
    >
      <defs>
        <filter id={HAND_DRAWN_FILTER_ID} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <radialGradient id="bodyGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={BODY} />
          <stop offset="100%" stopColor="#F5F2EC" />
        </radialGradient>
      </defs>

      {/* ============================================================ */}
      {/* Shadow — just enough to ground the character */}
      {/* ============================================================ */}
      <ellipse cx="100" cy="192" rx="38" ry="5" fill={SHADOW} />

      {/* ============================================================ */}
      {/* Body — a single soft rounded shape, like a beanbag */}
      {/* ============================================================ */}
      <ellipse
        cx="100" cy="152" rx="42" ry="32"
        fill="url(#bodyGrad)"
        stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />

      {/* ============================================================ */}
      {/* Front paws — two simple ovals, slightly apart */}
      {/* ============================================================ */}
      <ellipse cx="74" cy="180" rx="9" ry="6"
        fill={BODY} stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />
      <ellipse cx="126" cy="180" rx="9" ry="6"
        fill={BODY} stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />

      {/* ============================================================ */}
      {/* Ears — floppy soft triangles hanging from head sides */}
      {/* ============================================================ */}
      {/* Left ear */}
      <path
        d="M 70 66 Q 58 64 62 50 Q 66 40 76 44 Q 78 56 78 60"
        fill={BODY} stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />
      {/* Right ear */}
      <path
        d="M 130 66 Q 142 64 138 50 Q 134 40 124 44 Q 122 56 122 60"
        fill={BODY} stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />

      {/* ============================================================ */}
      {/* Head — large round shape, the focal point */}
      {/* ============================================================ */}
      <ellipse
        cx="100" cy="78" rx="38" ry="34"
        fill="url(#bodyGrad)"
        stroke={OUTLINE} strokeWidth="2" strokeLinecap="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />

      {/* ============================================================ */}
      {/* Scarf — thin band around neck, modest tail */}
      {/* ============================================================ */}
      <path d="M 66 104 Q 100 114 134 104"
        fill="none" stroke={SCARF} strokeWidth="6" strokeLinecap="round" opacity="0.85" />
      <path d="M 66 104 Q 100 114 134 104"
        fill="none" stroke={SCARF_STRIPE} strokeWidth="1.2" strokeLinecap="round" opacity="0.5"
        transform="translate(0, -1.5)" />
      <path d="M 128 107 Q 132 124 129 140"
        fill="none" stroke={SCARF} strokeWidth="5" strokeLinecap="round" opacity="0.85" />

      {/* ============================================================ */}
      {/* Eyebrows — barely-there arcs */}
      {/* ============================================================ */}
      <path d="M 76 60 Q 84 57 92 60" fill="none" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" opacity="0.25" />
      <path d="M 108 60 Q 116 57 124 60" fill="none" stroke={OUTLINE} strokeWidth="1.2" strokeLinecap="round" opacity="0.25" />

      {/* ============================================================ */}
      {/* Glasses — simple round frames, thin */}
      {/* ============================================================ */}
      <circle cx={lx} cy={ly - 2} r="9" fill="none" stroke={GLASSES} strokeWidth="1.3" />
      <circle cx={rx} cy={ry - 2} r="9" fill="none" stroke={GLASSES} strokeWidth="1.3" />
      <line x1={lx + 9} y1={ly - 2} x2={rx - 9} y2={ry - 2} stroke={GLASSES} strokeWidth="1" />

      {/* Night glasses warm tint */}
      {isNight && (
        <>
          <circle cx={lx} cy={ly - 2} r="9" fill="none" stroke="rgba(245,213,160,0.22)" strokeWidth="1.3" />
          <circle cx={rx} cy={ry - 2} r="9" fill="none" stroke="rgba(245,213,160,0.22)" strokeWidth="1.3" />
        </>
      )}

      {/* ============================================================ */}
      {/* Eyes — two dark dots, the soul of the character */}
      {/* ============================================================ */}
      <circle cx={lx} cy={ly} r="3.5" fill={OUTLINE} />
      <circle cx={rx} cy={ry} r="3.5" fill={OUTLINE} />

      {/* Tiny eye highlights */}
      <circle cx={lx - 1} cy={ly - 1.2} r="1.2" fill="white" opacity="0.35" />
      <circle cx={rx - 1} cy={ry - 1.2} r="1.2" fill="white" opacity="0.35" />

      {/* ============================================================ */}
      {/* Blink — two thin lines that slide down over the eyes */}
      {/* ============================================================ */}
      <g
        style={{
          transform: `scaleY(${blinkClosed ? 1 : 0})`,
          transformOrigin: "center",
          transition: `transform ${blinkClosed ? "0.06s" : "0.04s"} ease`,
        }}
      >
        <line x1={lx - 4} y1={ly} x2={lx + 4} y2={ly}
          stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
        <line x1={rx - 4} y1={ry} x2={rx + 4} y2={ry}
          stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* ============================================================ */}
      {/* Nose — small filled oval */}
      {/* ============================================================ */}
      <ellipse cx="100" cy="92" rx="4" ry="3" fill={NOSE} opacity="0.85" />

      {/* ============================================================ */}
      {/* Mouth — tiny relaxed arc, barely there */}
      {/* ============================================================ */}
      <path
        d="M 96 98 Q 100 101 104 98"
        fill="none" stroke={OUTLINE} strokeWidth="0.9" strokeLinecap="round" opacity="0.25"
      />
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
