/** Phase 1: XiaoWai SVG character — zero animation library dependency. */

import { memo } from "react";
import { COLORS, VIEWBOX } from "./companion-config";
import { HAND_DRAWN_FILTER_ID, SVG_CONTAINER_STYLE } from "./companion-styles";

interface XiaoWaiSVGProps {
  breathingScale: number;
  blinkClosed: boolean;
  pupilOffset: { dx: number; dy: number };
  isNight: boolean;
}

function XiaoWaiSVGInner({ breathingScale, blinkClosed, pupilOffset, isNight }: XiaoWaiSVGProps) {
  const b = COLORS;

  // Compute pupil positions from props (updated via rAF in the parent hook)
  const leftIrisCX = 89 + pupilOffset.dx * 0.4;
  const leftIrisCY = 97 + pupilOffset.dy * 0.4;
  const rightIrisCX = 111 + pupilOffset.dx * 0.4;
  const rightIrisCY = 97 + pupilOffset.dy * 0.4;
  const leftPupilCX = 89 + pupilOffset.dx;
  const leftPupilCY = 97 + pupilOffset.dy;
  const rightPupilCX = 111 + pupilOffset.dx;
  const rightPupilCY = 97 + pupilOffset.dy;
  const leftHighlightCX = 87 + pupilOffset.dx * 0.3;
  const leftHighlightCY = 94 + pupilOffset.dy * 0.3;
  const rightHighlightCX = 109 + pupilOffset.dx * 0.3;
  const rightHighlightCY = 94 + pupilOffset.dy * 0.3;

  return (
    <svg
      viewBox={VIEWBOX}
      style={{
        ...SVG_CONTAINER_STYLE,
        transform: `scale(${breathingScale})`,
        transformOrigin: "center center",
        willChange: breathingScale !== 1 ? "transform" : "auto",
      }}
    >
      <defs>
        {/* Hand-drawn line jitter filter — inlined to keep .ts file JSX-free */}
        <filter id={HAND_DRAWN_FILTER_ID} x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.4" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Scarf knit texture pattern */}
        <pattern id="scarf-knit" width="4" height="4" patternUnits="userSpaceOnUse">
          <line x1="0" y1="2" x2="4" y2="2" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />
          <line x1="2" y1="0" x2="2" y2="4" stroke="rgba(255,255,255,0.05)" strokeWidth="0.6" />
        </pattern>

        {/* Subtle body gradient for depth */}
        <radialGradient id="body-grad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={b.body} />
          <stop offset="100%" stopColor="#F5F0E8" />
        </radialGradient>

        {/* Ear inner gradient */}
        <radialGradient id="ear-inner-grad" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor={b.earInner} />
          <stop offset="100%" stopColor="#F0E8D8" />
        </radialGradient>
      </defs>

      {/* ============================================ */}
      {/* Layer -1: Ground shadow */}
      {/* ============================================ */}
      <ellipse cx="100" cy="225" rx="55" ry="6" fill={b.shadow} />

      {/* ============================================ */}
      {/* Layer 0: Body (lying posture) */}
      {/* ============================================ */}
      <ellipse
        cx="100" cy="165" rx="46" ry="32"
        fill="url(#body-grad)"
        stroke={b.outline} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />

      {/* ============================================ */}
      {/* Layer 1: Front paws */}
      {/* ============================================ */}
      <ellipse cx="75" cy="192" rx="11" ry="7"
        fill={b.body} stroke={b.outline} strokeWidth="2"
        strokeLinecap="round" filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />
      <ellipse cx="105" cy="194" rx="11" ry="7"
        fill={b.body} stroke={b.outline} strokeWidth="2"
        strokeLinecap="round" filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />
      {/* Tiny paw pads */}
      <ellipse cx="75" cy="194" rx="5" ry="2.5" fill={b.pawPad} opacity="0.5" />
      <ellipse cx="105" cy="196" rx="5" ry="2.5" fill={b.pawPad} opacity="0.5" />

      {/* ============================================ */}
      {/* Layer 2: Scarf (behind head, above body) */}
      {/* ============================================ */}
      <g>
        <path
          d="M 72 122 Q 100 132 128 122"
          fill="none" stroke={b.scarf} strokeWidth="8" strokeLinecap="round" opacity="0.9"
        />
        <path
          d="M 72 122 Q 100 132 128 122"
          fill="none" stroke={b.scarfStripe} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"
          transform="translate(0, -2)"
        />
        <path
          d="M 120 125 Q 126 145 122 170"
          fill="none" stroke={b.scarf} strokeWidth="7" strokeLinecap="round" opacity="0.9"
        />
        <path
          d="M 120 125 Q 126 145 122 170"
          fill="none" stroke={b.scarfStripe} strokeWidth="1.5" strokeLinecap="round" opacity="0.6"
          transform="translate(-2, 0)"
        />
        <path
          d="M 72 122 Q 100 132 128 122 M 120 125 Q 126 145 122 170"
          fill="none" stroke="url(#scarf-knit)" strokeWidth="8" strokeLinecap="round" opacity="0.6"
        />
      </g>

      {/* ============================================ */}
      {/* Layer 3: Ears */}
      {/* ============================================ */}
      {/* Left ear */}
      <g>
        <path
          d="M 72 82 Q 64 70 70 58 Q 78 52 82 68 Z"
          fill="url(#body-grad)" stroke={b.outline} strokeWidth="2.3"
          strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#${HAND_DRAWN_FILTER_ID})`}
        />
        <path
          d="M 73 78 Q 68 68 72 60"
          fill="none" stroke={b.earInner} strokeWidth="4" strokeLinecap="round" opacity="0.5"
        />
        {/* Ear fur wisps */}
        <path d="M 70 58 Q 66 52 68 48" fill="none" stroke={b.furWisp} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
        <path d="M 72 56 Q 70 48 73 44" fill="none" stroke={b.furWisp} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      </g>
      {/* Right ear */}
      <g>
        <path
          d="M 128 82 Q 136 70 130 58 Q 122 52 118 68 Z"
          fill="url(#body-grad)" stroke={b.outline} strokeWidth="2.3"
          strokeLinecap="round" strokeLinejoin="round"
          filter={`url(#${HAND_DRAWN_FILTER_ID})`}
        />
        <path
          d="M 127 78 Q 132 68 128 60"
          fill="none" stroke={b.earInner} strokeWidth="4" strokeLinecap="round" opacity="0.5"
        />
        <path d="M 130 58 Q 134 52 132 48" fill="none" stroke={b.furWisp} strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
        <path d="M 128 56 Q 130 48 127 44" fill="none" stroke={b.furWisp} strokeWidth="0.8" strokeLinecap="round" opacity="0.4" />
      </g>

      {/* ============================================ */}
      {/* Layer 4: Head */}
      {/* ============================================ */}
      <ellipse cx="100" cy="100" rx="32" ry="28"
        fill="url(#body-grad)" stroke={b.outline} strokeWidth="2.5"
        strokeLinecap="round" filter={`url(#${HAND_DRAWN_FILTER_ID})`}
      />

      {/* Cheek fur wisps */}
      <path d="M 68 100 Q 62 98 60 102" fill="none" stroke={b.furWisp} strokeWidth="0.8" strokeLinecap="round" opacity="0.35" />
      <path d="M 132 100 Q 138 98 140 102" fill="none" stroke={b.furWisp} strokeWidth="0.8" strokeLinecap="round" opacity="0.35" />

      {/* ============================================ */}
      {/* Layer 5: Glasses */}
      {/* ============================================ */}
      <g>
        <circle cx="89" cy="97" r="11" fill="none" stroke={b.glasses} strokeWidth="1.5" />
        <circle cx="111" cy="97" r="11" fill="none" stroke={b.glasses} strokeWidth="1.5" />
        <line x1="100" y1="97" x2="100" y2="97" stroke={b.glasses} strokeWidth="1.2" />
        {isNight && (
          <>
            <circle cx="89" cy="97" r="11" fill="none" stroke="rgba(245,213,160,0.25)" strokeWidth="1.5" />
            <circle cx="111" cy="97" r="11" fill="none" stroke="rgba(245,213,160,0.25)" strokeWidth="1.5" />
          </>
        )}
      </g>

      {/* ============================================ */}
      {/* Layer 6: Eyes */}
      {/* ============================================ */}
      <g>
        {/* Eye whites */}
        <ellipse cx="89" cy="97" rx="8" ry="9" fill={b.eyeWhite} />
        <ellipse cx="111" cy="97" rx="8" ry="9" fill={b.eyeWhite} />

        {/* Irises (position computed from pupilOffset, updated via rAF) */}
        <circle cx={leftIrisCX} cy={leftIrisCY} r="5.5" fill={b.iris} />
        <circle cx={rightIrisCX} cy={rightIrisCY} r="5.5" fill={b.iris} />

        {/* Iris highlights */}
        <circle cx={leftHighlightCX} cy={leftHighlightCY} r="1.5" fill="white" opacity="0.7" />
        <circle cx={rightHighlightCX} cy={rightHighlightCY} r="1.5" fill="white" opacity="0.7" />

        {/* Pupils */}
        <circle cx={leftPupilCX} cy={leftPupilCY} r="3" fill={b.pupil} />
        <circle cx={rightPupilCX} cy={rightPupilCY} r="3" fill={b.pupil} />

        {/* Eyelids — blink via CSS transition on scaleY */}
        <g
          transform="translate(89, 88)"
          style={{
            transform: `scaleY(${blinkClosed ? 1 : 0})`,
            transformOrigin: "0px 0px",
            transition: `transform ${blinkClosed ? "0.08s" : "0.05s"} ease`,
          }}
        >
          <ellipse cx="0" cy="9" rx="9" ry="10" fill={b.body} />
        </g>
        <g
          transform="translate(111, 88)"
          style={{
            transform: `scaleY(${blinkClosed ? 1 : 0})`,
            transformOrigin: "0px 0px",
            transition: `transform ${blinkClosed ? "0.08s" : "0.05s"} ease`,
          }}
        >
          <ellipse cx="0" cy="9" rx="9" ry="10" fill={b.body} />
        </g>
      </g>

      {/* ============================================ */}
      {/* Layer 7: Nose + Mouth */}
      {/* ============================================ */}
      <polygon points="100,107 96,111 104,111" fill={b.nose} />
      <path
        d="M 97 114 Q 100 117 103 114"
        fill="none" stroke={b.outline} strokeWidth="0.8" strokeLinecap="round" opacity="0.35"
      />
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
