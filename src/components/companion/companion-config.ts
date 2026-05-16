export const EDGE_INSET = 24;
export const Z_INDEX = 50;
export const MOBILE_BREAKPOINT = 1024;
export const LEFT_DOCK_PAGES = ["/coding"] as const;

export const TIMING = {
  breathingCycle: 6000,
  blinkMin: 4000,
  blinkMax: 10000,
  blinkDuration: 250,
  pupilMaxOffset: 2,
  eyeDelay: 320,
  cursorBlink: 1500,
  fadeIn: 300,
  expand: 400,
} as const;

/** Terminal sizing */
export const TERMINAL = {
  mini: { w: 280, h: 44 },
  panel: { w: 380, h: 300 },
  font: "'JetBrains Mono', 'Fira Code', 'Consolas', 'SF Mono', monospace",
  fontSize: 12,
  lineHeight: 1.5,
  borderRadius: 8,
  panelRadius: 10,
} as const;

export type OrbState = "idle" | "searching" | "completed" | "error" | "waiting";

export const STATE_LABEL: Record<OrbState, string> = {
  idle: "standby", searching: "crawling", completed: "synced", error: "error", waiting: "pause",
};

export const STATE_COLOR: Record<OrbState, string> = {
  idle: "#38bdf8", searching: "#f59e0b", completed: "#10b981", error: "#f43f5e", waiting: "#94a3b8",
};

/** Daily English quotes */
export const QUOTES = [
  "Progress, not perfection.",
  "Small steps every day.",
  "Consistency beats intensity.",
  "Trust the process.",
  "Data tells the story.",
  "Frameworks build clarity.",
  "Every article counts.",
  "Patterns emerge from patience.",
  "The archive is alive.",
  "Keep the signal clear.",
  "Discourse is a journey.",
  "Index the world.",
  "Read widely, code deeply.",
  "Stay curious, stay humble.",
  "Your potential is infinite.",
];

/** Daily Chinese encouragement */
export const CN_QUOTES = [
  "今天也要开心哦",
  "我们是最棒的",
  "慢慢来，比较快",
  "每一步都算数",
  "专注的你闪闪发光",
  "保持好奇心",
  "研究是一场马拉松",
  "安静的坚持最有力量",
  "你今天编码的样子很帅",
  "语料库又长大了一点点",
  "读懂世界，也读懂自己",
  "每一个标注都是思考的痕迹",
  "深夜的研究者不孤单",
  "做研究的人自带光芒",
  "相信积累的力量",
];
