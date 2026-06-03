# OutEye 外眼 2.0 · OutSight

> 话语研究协作平台 — 英语主流媒体话语研究的轻量化协作基础设施。

**作者：** 赵琰（山东大学翻译学院）

---

## 项目简介

OutSight 是 OutEye 外眼系列的核心产品，面向英语主流媒体话语研究场景，提供从语料采集、AI 辅助编码到统计分析的全流程协作工具。

传统话语研究依赖人工标注、Excel 统计、邮件协作，效率低且难以复现。OutSight 将这些流程整合到一个轻量化 Web 平台中，让研究团队专注于分析本身，而非工具。

## 核心功能

| 模块 | 功能 | 说明 |
|------|------|------|
| 语料管理 | 上传、检索、归档 | 支持批量导入，自动提取正文 |
| AI 辅助编码 | DeepSeek 驱动 | 自动标注话语框架节点，支持人工校验 |
| 编码对比 | 多人编码一致性 | 并排对比不同编码者的标注结果 |
| 统计分析 | ECharts 可视化 | 编码分布、进度追踪、一致性指标 |
| 语言学分析 | 专项工具 | 词汇、句法、语篇层面的量化分析 |
| 国内对比 | 跨语料对比 | 国内外媒体报道的对比分析 |
| 文献管理 | 相关文献库 | 关联参考文献，支持引用 |
| 项目管理 | 任务分配 | 按语料分配编码任务，追踪完成状态 |

## 技术栈

| 层 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 后端 | Supabase (Auth + PostgreSQL + Storage + Realtime) |
| AI | DeepSeek-V3/4.0 |
| 可视化 | ECharts |
| 部署 | Vercel |

## 快速启动

```bash
# 1. 克隆仓库
git clone <repo-url>
cd outsight-project

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase URL 和 Key

# 4. 数据库迁移
# 将 supabase/migrations/ 下的 SQL 在 Supabase SQL Editor 中执行

# 5. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可访问。

## 项目结构

```
src/
├── app/
│   ├── (auth)/              # 未认证路由（登录）
│   ├── (app)/               # 认证后路由
│   │   ├── dashboard/       # 控制台概览
│   │   ├── coding/          # 语料编码
│   │   ├── analytics/       # 统计分析
│   │   ├── literature/      # 文献管理
│   │   ├── linguistics/     # 语言学分析
│   │   ├── domestic/        # 国内对比
│   │   ├── defense/         # 辩护模块
│   │   ├── projects/        # 项目管理
│   │   └── settings/        # 系统设置
│   ├── api/                 # API Routes
│   └── auth/callback/       # Supabase Auth 回调
├── components/
│   ├── auth/                # 登录表单、每日一句
│   ├── layout/              # 侧边栏、状态栏、面包屑
│   ├── shared/              # 通用组件
│   └── ui/                  # shadcn/ui 基础组件
├── lib/
│   ├── supabase/            # Supabase 客户端（Browser/Server/Admin）
│   ├── data-access/         # Repository 模式数据访问层
│   └── constants.ts         # 应用常量
├── stores/                  # Zustand 全局状态
├── hooks/                   # 自定义 Hooks
└── types/                   # TypeScript 类型定义
```

## 设计规范

### 色彩系统

| Token | 色值 | 用途 |
|-------|------|------|
| `--color-primary` | #4A90A4 | 雾青：按钮、链接、强调 |
| `--color-secondary` | #2D3436 | 石墨：导航、标题 |
| `--color-accent` | #5DAD93 | 薄荷：成功状态、进度 |
| `--color-background` | #FAFBFC | 素白：主背景 |
| `--color-card` | #F0F2F5 | 浅灰：卡片底色 |

### 字体

- 正文/UI：Inter, PingFang SC, Microsoft YaHei
- 数据/代码：JetBrains Mono, Fira Code

## 数据库

10 张核心表，通过外键关联：

```
profiles ──── coding_frameworks ──── coding_nodes
             │
             ├── articles ──── annotations ──── coding_nodes
             │
             ├── assignments (任务分配)
             ├── collection_logs (采集日志)
             ├── activity_logs (操作审计)
             ├── ai_queue (AI 处理队列)
             └── ai_prompts (Prompt 模板)
```

所有表启用 Row Level Security (RLS)，确保数据隔离。

## 文档

完整技术文档见 `docs/` 目录：

- [架构决策记录](docs/architecture.md)
- [数据库 Schema](docs/database-schema.md)
- [认证流程](docs/auth-flow.md)
- [Supabase 配置](docs/supabase-setup.md)
- [色彩系统](docs/color-system.md)
- [API 规范](docs/api-conventions.md)
- [Sprint 0 交付清单](docs/sprint-0-changelog.md)

## 许可

本项目仅供学术科研使用。

---

*OutEye 外眼 — 让话语研究更高效。*
