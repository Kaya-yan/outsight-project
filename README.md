# OutEye 外眼 2.0 · OutSight

话语研究协作平台 — 英语主流媒体话语研究的轻量化协作基础设施。

## 技术栈

| 层 | 技术 |
|------|------|
| 框架 | Next.js 14 (App Router) + TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 后端 | Supabase (Auth + PostgreSQL + Storage) |
| AI | DeepSeek-V3/4.0 |

## 快速启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase URL 和 Key

# 3. 执行数据库迁移
# 将 supabase/migrations/0000_initial_schema.sql 在 Supabase SQL Editor 中运行

# 4. 启动开发服务器
npm run dev
```

## 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # 未认证路由组（登录页）
│   ├── (app)/              # 认证后路由组（控制台/语料/编码/统计/设置）
│   ├── auth/callback/      # Supabase Auth 回调
│   └── api/                # API Routes
├── components/
│   ├── auth/               # 登录表单、每日一句、学术声明
│   ├── layout/             # 侧边栏、状态栏、面包屑、用户菜单
│   ├── shared/             # 通用组件（空状态等）
│   └── ui/                 # shadcn/ui 基础组件
├── lib/
│   ├── supabase/           # Supabase 客户端（Browser/Server/Admin）
│   ├── data-access/        # Repository 模式数据访问层
│   ├── quotes.ts           # 60 条每日一句
│   └── constants.ts        # 应用常量
├── stores/                 # Zustand 全局状态（auth、ui）
├── hooks/                  # 自定义 Hooks
└── types/                  # TypeScript 类型定义
```

## 文档

完整技术文档见 [docs/](./docs/README.md)。

## 许可

本平台仅供学术科研使用。
