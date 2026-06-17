export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  PROJECTS: "/projects",
  CODING: "/coding",
  ANALYTICS: "/analytics",
  SETTINGS: "/settings",
} as const;

export const ROLES = {
  ADMIN: "admin",
  LEAD_RESEARCHER: "lead_researcher",
  RESEARCHER: "researcher",
  CODER: "coder",
  VIEWER: "viewer",
} as const;

export const SESSION_DURATION_DAYS = 30;

export const ARCHIVE_AFTER_DAYS = 90;

export const APP_NAME = "外眼 2.0";
export const APP_CODE = "OutSight";
export const APP_VERSION = "2.0.0";

export const MEDIA_OUTLETS = [
  { value: "NYT", label: "The New York Times" },
  { value: "WP", label: "The Washington Post" },
  { value: "WSJ", label: "The Wall Street Journal" },
  { value: "Guardian", label: "The Guardian" },
  { value: "Economist", label: "The Economist" },
  { value: "BBC", label: "BBC News" },
] as const;

export { RESEARCH_PERIODS } from "./research-periods";

export const ARTICLE_STATUS_LABELS: Record<string, string> = {
  "待发现": "待发现",
  "已入库": "已入库",
  "已下载全文": "已下载全文",
  "已清洗": "已清洗",
  "已预读": "已预读",
  "待编码": "待编码",
  "编码完成": "编码完成",
  "已封存": "已封存",
};

export const ARTICLE_STATUS_COLORS: Record<string, string> = {
  "待发现": "text-[#7F8A93] bg-[#7F8A93]/10",
  "已入库": "text-[#4A90A4] bg-[#4A90A4]/10",
  "已下载全文": "text-white bg-[#4A90A4]",
  "已清洗": "text-[#4A90A4] bg-[#4A90A4]/10",
  "已预读": "text-[#5DAD93] bg-[#5DAD93]/10",
  "待编码": "text-[#E67E22] bg-[#E67E22]/10",
  "编码完成": "text-[#5DAD93] bg-[#5DAD93]/10",
  "已封存": "text-[#2D3436] bg-[#2D3436]/10",
};
