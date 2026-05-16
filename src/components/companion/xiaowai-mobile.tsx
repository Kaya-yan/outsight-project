import { memo } from "react";

function XiaoWaiMobileInner() {
  return (
    <div
      style={{
        position: "fixed", right: 16, bottom: 16,
        width: 48, height: 48, opacity: 0.55, pointerEvents: "none", zIndex: 100,
      }}
      aria-label="XiaoWai"
    >
      <svg viewBox="0 0 200 200" width="48" height="48">
        <path
          d="M 68 72 C 65 52, 82 40, 100 40 C 118 40, 135 52, 132 72 C 134 82, 130 92, 122 98 C 114 104, 86 104, 78 98 C 70 92, 66 82, 68 72 Z"
          fill="none" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M 72 55 C 48 50, 38 72, 42 92 C 44 108, 58 114, 68 102"
          fill="none" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        />
        <path
          d="M 128 55 C 152 50, 162 72, 158 92 C 156 108, 142 114, 132 102"
          fill="none" stroke="#2D2D2D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        />
        <circle cx="88" cy="70" r="3" fill="#2D2D2D" />
        <circle cx="112" cy="70" r="3" fill="#2D2D2D" />
        <circle cx="100" cy="82" r="2.5" fill="#2D2D2D" />
      </svg>
    </div>
  );
}

export const XiaoWaiMobile = memo(XiaoWaiMobileInner);
