# Sprint 0 交付清单

> 状态：Final · 交付日期：2026-05-08

## 已交付

### 基础设施
- [x] Next.js 14 App Router 项目脚手架
- [x] TypeScript + Tailwind CSS + shadcn/ui 配置
- [x] OutSight 色彩系统 (CSS Variables + Tailwind 扩展)
- [x] Inter + JetBrains Mono 字体配置

### 数据库
- [x] 10 张核心表 DDL（含索引、约束、RLS）
- [x] 自动触发器（用户注册创建 profile、updated_at 自动更新）
- [x] TypeScript Database 类型定义

### 认证
- [x] Supabase Auth 无密码登录（Magic Link）
- [x] Middleware 路由守卫
- [x] Auth Callback 处理
- [x] Login / Logout / Access Link API Routes
- [x] Zustand Auth Store + useAuth Hook

### 前端
- [x] 登录页面：每日一句（60条）+ 学术声明 + 表单状态机
- [x] 64px 左侧导航栏（5 项导航 + 活跃状态高亮）
- [x] 48px 顶部状态栏（面包屑 + 用户菜单）
- [x] 空控制台页面（欢迎卡片 + 模块卡片 + 统计卡片）
- [x] 所有路由占位页面

### 抽象层
- [x] Supabase 客户端（Browser / Server / Admin）
- [x] 数据访问 Repository 层（10 个模块）

### 文档
- [x] 8 份技术文档（架构 / Schema / 认证 / Supabase / 色彩 / API / 更新日志）
- [x] 根目录 README

## 延期至 Sprint 1+

- [ ] Email OTP 二次验证
- [ ] iPad 响应式布局
- [ ] 语料归档自动定时任务
- [ ] NVivo 兼容导出
- [ ] 完整移动端适配
