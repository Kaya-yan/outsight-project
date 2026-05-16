import { EDGE_INSET, Z_INDEX, TERMINAL } from "./companion-config";

/** Mini terminal bar (default state) */
export function miniBarStyle(dockLeft: boolean): React.CSSProperties {
  return {
    position: "fixed",
    [dockLeft ? "left" : "right"]: EDGE_INSET,
    bottom: EDGE_INSET,
    width: TERMINAL.mini.w,
    height: TERMINAL.mini.h,
    zIndex: Z_INDEX,
    cursor: "default",
    userSelect: "none",
    background: "rgba(15, 23, 42, 0.88)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px solid rgba(56, 189, 248, 0.12)",
    borderRadius: TERMINAL.borderRadius,
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
    fontFamily: TERMINAL.font,
    fontSize: TERMINAL.fontSize,
    lineHeight: TERMINAL.lineHeight,
    color: "rgba(226, 232, 240, 0.85)",
    display: "flex",
    alignItems: "center",
    padding: "0 14px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    transition: `width ${400}ms ease-out, height ${400}ms ease-out, border-radius ${400}ms ease-out`,
  };
}

/** Expanded panel (hover state) */
export function panelStyle(dockLeft: boolean): React.CSSProperties {
  return {
    ...miniBarStyle(dockLeft),
    width: TERMINAL.panel.w,
    height: TERMINAL.panel.h,
    borderRadius: TERMINAL.panelRadius,
    background: "rgba(15, 23, 42, 0.92)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    border: "1px solid rgba(56, 189, 248, 0.18)",
    boxShadow: "0 12px 48px rgba(0, 0, 0, 0.3)",
    padding: "16px 18px",
    flexDirection: "column",
    alignItems: "stretch",
    whiteSpace: "normal",
    overflow: "hidden",
  };
}

export function orbModalOpacity(hasModal: boolean): number {
  return hasModal ? 0.2 : 1;
}
