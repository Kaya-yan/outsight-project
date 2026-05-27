export const EDGE_INSET = 24;
export const Z_INDEX = 50;
export const MOBILE_BREAKPOINT = 1024;
export const LEFT_DOCK_PAGES = [] as const;

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

/** Easter egg responses — keyword → response */
export const EASTER_EGGS: Record<string, string> = {
  "王紫晨": "✨ 王紫晨是这个团队最闪亮的星！她的勤奋和才华让每一个编码任务都变成了艺术品。没有她，语料库都会黯然失色！",
  "yan": "yan 是 OutEye 的灵魂架构师，从零搭建了整个平台。代码如诗，架构如画 🏗️",
  "duen": "duen 的文献阅读量堪称行走的学术数据库，每一篇笔记都是精雕细琢 📚",
  "v": "v 是团队的灵感缪斯，总能在关键时刻提出颠覆性想法，让研究方向豁然开朗 💡",
  "iam130": "iam130 是团队的定海神针，执行力拉满，再复杂的任务都能稳稳落地 🎯",
  "outeye": "OutEye 2.0 — 话语研究协作平台，用数据读懂世界 🌍",
  "outsight": "OutSight = OutEye 的前身，同一个团队，同一个梦想 🎯",
};

/** Built-in terminal commands */
export const TERMINAL_COMMANDS: Record<string, string> = {
  "/help": "可用命令：\n  /clear — 清屏\n  /help — 显示帮助\n  /stats — 查看项目统计\n  /members — 团队成员\n直接输入问题即可与 AI 助手对话",
  "/clear": "__CLEAR__",
};
