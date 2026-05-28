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
    cursor: "pointer",
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
  };
}

/** Expanded panel (interactive terminal) */
export function panelStyle(dockLeft: boolean): React.CSSProperties {
  return {
    position: "fixed",
    [dockLeft ? "left" : "right"]: EDGE_INSET,
    bottom: EDGE_INSET,
    width: TERMINAL.panel.w,
    height: 420,
    zIndex: Z_INDEX,
    cursor: "default",
    userSelect: "none",
    background: "rgba(15, 23, 42, 0.95)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    borderRadius: TERMINAL.panelRadius,
    boxShadow: "0 16px 64px rgba(0, 0, 0, 0.4)",
    fontFamily: TERMINAL.font,
    fontSize: TERMINAL.fontSize,
    lineHeight: TERMINAL.lineHeight,
    color: "rgba(226, 232, 240, 0.85)",
    padding: "14px 16px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
}
