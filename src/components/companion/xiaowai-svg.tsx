import { memo } from "react";
import { SVG_STYLE } from "./companion-styles";

const STROKE = "#2D2D2D";
const SW = 3;

interface Props {
  breathingScale: number;
  blinkClosed: boolean;
  pupilOffset: { dx: number; dy: number };
  headTilt: number;
}

function XiaoWaiSVGInner({ breathingScale, blinkClosed, pupilOffset, headTilt }: Props) {
  const ex = 88 + pupilOffset.dx;
  const ey = 70 + pupilOffset.dy;
  const ex2 = 112 + pupilOffset.dx;
  const ey2 = 70 + pupilOffset.dy;

  return (
    <svg viewBox="0 0 200 200" style={SVG_STYLE}>

      {/* ── breathing wrapper ── */}
      <g style={{
        transform: `scale(${breathingScale})`,
        transformOrigin: "100px 110px",
        transition: "transform 0s",
      }}>

        {/* ── head tilt wrapper ── */}
        <g style={{
          transform: `rotate(${headTilt}deg)`,
          transformOrigin: "100px 72px",
          transition: headTilt !== 0 ? "transform 0.4s ease-out" : "transform 0.6s ease-in-out",
        }}>

          {/* === 头部轮廓 === */}
          <path
            d="M 68 72 C 65 52, 82 40, 100 40 C 118 40, 135 52, 132 72 C 134 82, 130 92, 122 98 C 114 104, 86 104, 78 98 C 70 92, 66 82, 68 72 Z"
            fill="none" stroke={STROKE} strokeWidth={SW}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* === 左耳 === */}
          <path
            d="M 72 55 C 48 50, 38 72, 42 92 C 44 108, 58 114, 68 102"
            fill="none" stroke={STROKE} strokeWidth={SW}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* === 右耳 === */}
          <path
            d="M 128 55 C 152 50, 162 72, 158 92 C 156 108, 142 114, 132 102"
            fill="none" stroke={STROKE} strokeWidth={SW}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* === 身体轮廓 === */}
          <path
            d="M 80 100 C 72 112, 68 132, 72 150 C 74 162, 86 168, 100 168 C 114 168, 126 162, 128 150 C 132 132, 128 112, 120 100"
            fill="none" stroke={STROKE} strokeWidth={SW}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* === 左前脚 === */}
          <path
            d="M 85 158 C 82 170, 88 176, 96 172 C 100 168, 98 162, 95 158"
            fill="none" stroke={STROKE} strokeWidth={SW}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* === 右前脚 === */}
          <path
            d="M 115 158 C 118 170, 112 176, 104 172 C 100 168, 102 162, 105 158"
            fill="none" stroke={STROKE} strokeWidth={SW}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* === 左眼 === */}
          <circle cx={ex} cy={ey} r="3" fill={STROKE} />
          {/* === 右眼 === */}
          <circle cx={ex2} cy={ey2} r="3" fill={STROKE} />

          {/* === 鼻子 === */}
          <circle cx="100" cy="82" r="2.5" fill={STROKE} />

          {/* === 嘴巴 === */}
          <path
            d="M 100 86 L 97 91 M 100 86 L 103 91"
            fill="none" stroke={STROKE} strokeWidth="2.5"
            strokeLinecap="round"
          />

        </g>

        {/* ── blink overlay (outside tilt group so lines stay level) ── */}
        <g style={{
          opacity: blinkClosed ? 1 : 0,
          transition: `opacity ${blinkClosed ? "0.05s" : "0.03s"} ease`,
        }}>
          <line x1={ex - 4} y1={ey} x2={ex + 4} y2={ey}
            stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
          <line x1={ex2 - 4} y1={ey2} x2={ex2 + 4} y2={ey2}
            stroke={STROKE} strokeWidth="2.5" strokeLinecap="round" />
        </g>

      </g>
    </svg>
  );
}

export const XiaoWaiSVG = memo(XiaoWaiSVGInner);
