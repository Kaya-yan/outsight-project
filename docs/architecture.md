# 架构决策记录 (ADR)

> 状态：Draft · 最后更新：2026-05-08

## ADR-001: Next.js 14 App Router

**决策**：采用 Next.js 14 App Router 作为全栈框架。

**理由**：
- Server Components 适合数据密集型页面（语料表格、统计图表）
- Route Groups 实现认证/未认证页面的布局隔离
- Middleware 实现声明式路由守卫
- 与 Vercel 托管的天然集成

## ADR-002: Zustand 状态管理

**决策**：使用 Zustand 替代 Redux / Context。

**理由**：
- 极低 boilerplate，适合 5 人团队
- 可在 Server 和 Client 组件间灵活使用
- TypeScript 支持优秀
- bundle 体积小 (~1KB)

## ADR-003: Supabase 托管后端

**决策**：使用 Supabase 替代自建 PostgreSQL + 自定义 Auth。

**理由**：
- 托管 PostgreSQL + Auth + Storage + Realtime 一体化
- Free Tier 足够支持 360 篇语料的学术项目
- RLS 实现行级安全
- 抽象层隔离厂商锁定风险

## ADR-004: Repository 模式数据访问

**决策**：采用 Repository 模式，函数接受 Supabase Client 作为首参。

**理由**：
- Client 注入模式：同一函数可用于 Browser/Server/Admin 端
- 若需迁移到自建 PG，仅需重写 Repository 层
- 返回 `{ data, error }` tuple 统一错误处理
