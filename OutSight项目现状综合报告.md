# OutSight（外眼 2.0）项目现状综合报告

> **报告人**：赵琰（山东大学翻译学院）
> **报告日期**：2026年8月6日
> **用途**：导师沟通 / 科研下一步计划讨论

---

## 目录

1. [项目概况](#一项目概况)
2. [研究设计](#二研究设计)
3. [技术架构](#三技术架构)
4. [功能模块详解](#四功能模块详解)
5. [AI 分析能力矩阵](#五ai-分析能力矩阵)
6. [数据采集与处理](#六数据采集与处理)
7. [工程质量现状](#七工程质量现状)
8. [已完成工作清单](#八已完成工作清单)
9. [当前进行中的工作](#九当前进行中的工作)
10. [待解决问题与风险](#十待解决问题与风险)
11. [下一步科研方向建议](#十一下一步科研方向建议)

---

## 一、项目概况

### 1.1 项目定位

OutSight（外眼 2.0）是一个**面向话语研究的全栈学术协作平台**，核心研究议题为：

> **英语主流媒体如何报道和建构"中国式现代化"话语？**

平台将传统话语研究的全流程——语料采集、内容清洗、AI辅助编码、人工标注、编码员信度检验、统计分析、文献管理——整合到一个统一的Web协作环境中，替代传统依赖人工标注、Excel统计、邮件协作的低效模式。

### 1.2 研究理论框架

| 理论来源 | 代表人物 | 在平台中的应用 |
|---------|---------|-------------|
| 批评话语分析 (CDA) | Fairclough | 三维话语分析模型指导编码框架设计 |
| 框架理论 (Framing Theory) | Entman | AI自动识别威胁/机遇/问题/中立四类框架 |
| 内容分析法 | Krippendorff | Cohen's Kappa编码信度检验 |
| 语域理论 (Register Theory) | Halliday | 句法正式度分析 |
| 叙事学 | Genette | 宏观/微观叙事视角识别 |
| 互文性理论 | Kristeva | 政策文件、领导人讲话等互文引用追踪 |
| 第三空间理论 | Soja | 地域层级指向分析 |
| 政策工具分类 | Rothwell & Zegveld | 管制型/激励型/能力建设型/象征型政策工具 |
| 消息源分析 | van Dijk | 新闻话语结构与消息源类型分布 |

### 1.3 研究对象

| 维度 | 内容 |
|------|------|
| **英文主流媒体** | NYT、WP、WSJ、Guardian、Economist、BBC |
| **国内媒体对照** | 人民日报、新华社、环球时报等 |
| **时间窗口** | 2022年10月 — 2025年12月（7个半年周期） |
| **已入库语料** | 800+ 篇 |
| **研究团队** | 约5人（山东大学翻译学院） |

---

## 二、研究设计

### 2.1 语料工作流

```
待发现 → 已入库 → 已下载全文 → 已清洗 → 已预读 → 待编码 → 编码完成 → 已封存
```

每一步都有明确的状态转换规则和权限控制：
- **已入库 → 已封存**：允许跳过中间步骤，处理低质量语料
- **已清洗 → 待编码**：允许跳过AI预读，手动快速推进
- **已封存**：终端状态，不可逆

### 2.2 编码框架体系

- **树形层级结构**：采用嵌套集模型 (nested sets)，支持多级编码节点
- **每个节点**包含中英文标签、颜色标记、排序权重
- **支持多套编码框架**并存，适用于不同研究子课题
- **双编码机制**：每篇语料可分配给两位编码员独立标注，系统自动计算一致性

### 2.3 用户角色与权限

| 角色 | 权限范围 |
|------|---------|
| admin | 系统管理、用户管理、编码框架管理 |
| lead_researcher | 项目设定、任务分配、仲裁裁决 |
| researcher | 语料管理、AI分析触发、质量控制 |
| coder | 编码标注、查看分配任务 |
| viewer | 只读访问 |

### 2.4 任务分配系统

- 支持**独立编码**（solo）和**双人编码**（dual）两种模式
- 任务状态流转：open → in_progress → completed → reviewed
- 双人模式自动计算 agreement_rate 和 Cohen's Kappa
- 领任务制（claim），支持指定编码员和审核员

---

## 三、技术架构

### 3.1 技术栈

| 层级 | 技术选型 | 版本 |
|------|---------|------|
| **全栈框架** | Next.js (App Router) | 14.2.35 |
| **前端** | React + TypeScript | 18 / 5.x |
| **样式** | Tailwind CSS + shadcn/ui | 3.4 / 4.7 |
| **状态管理** | Zustand | 5.0 |
| **后端服务** | Supabase (Auth + PostgreSQL + Storage) | 最新 |
| **AI模型** | DeepSeek-V4 (Flash) | deepseek-v4-flash |
| **数据验证** | Zod | 4.x |
| **可视化** | Recharts + d3-cloud | 3.8 / 1.2 |
| **部署** | Vercel | — |

### 3.2 架构模式

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (React 18)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  Zustand  │  │ shadcn/ui│  │ Recharts / d3-cloud │  │
│  │  Stores   │  │ Components│ │   Visualizations    │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
│       │             │                   │               │
├───────┴─────────────┴───────────────────┴───────────────┤
│                 Next.js API Routes                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ /ai/*    │ │/articles │ │/coding/* │ │/domestic/*│  │
│  │ /auth/*  │ │ /analytics│ │/terminal │ │/literature│  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
├───────┴─────────────┴───────────┴─────────────┴─────────┤
│              Data Access Layer (Repository)              │
│  ┌──────────────────────────────────────────────────┐   │
│  │  typedInsert / typedUpdate / normalizePagination  │   │
│  │  17 entity files, type-safe, client-injected      │   │
│  └──────────────────────┬───────────────────────────┘   │
├─────────────────────────┴───────────────────────────────┤
│                   Supabase                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  Auth    │  │PostgreSQL│  │  Row Level Security  │  │
│  │  (SSR)   │  │ (14表)   │  │  (行级权限隔离)       │  │
│  └──────────┘  └──────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.3 项目规模统计

| 指标 | 数值 |
|------|------|
| TypeScript/TSX 源文件 | 236 个 |
| API 路由端点 | 150+ 个 |
| 数据库表 | 14 张 |
| 数据库迁移脚本 | 11 个 |
| 数据访问函数 | 17 个实体模块 |
| 全局状态 Store | 10 个 |
| React 组件 | 60+ 个 |
| 组件目录 | 12 个领域分类 |
| lib 工具模块 | 30+ 个文件 |
| 研究时段定义 | 7 个半年周期 |
| AI 分析维度 | 英语9维 + 中文8维 = 17维 |
| 采集数据源 | 4 路并行 (RSS/NewsAPI/GDELT/Search) |
| 正文提取策略 | 5 级降级链路 |

---

## 四、功能模块详解

### 4.1 控制台仪表盘 (`/dashboard`)

- 语料总览统计（总数、状态分布、完成率）
- 媒体 × 时段交叉矩阵（真实数据，非占位）
- 团队编码进度追踪
- 最近活动日志
- 192行代码，数据通过 dashboard data-access 聚合

### 4.2 语料管理 (`/projects`)

- 完整的文章 CRUD（创建、读取、更新、删除）
- 批量导入：支持CSV/JSON批量上传，含时间过滤与去重
- 状态流转面板：可视化展示当前状态与可执行操作
- 全文内容补全面板：显示正文获取状态、字数统计
- 文件上传模块：支持手动上传PDF/Word/HTML原文
- 媒体×时段筛选矩阵
- 归档与解档操作

### 4.3 AI辅助编码 (`/coding`)

- 语料列表视图：按任务状态筛选、排序
- 编码详情页 (`/coding/[id]`)：386行，核心交互页面
  - 左侧：原文阅读区，支持选中文本快速标注
  - 右侧：编码框架树，嵌套集结构的可展开节点
  - AI 面板：自动建议编码节点、翻译辅助
  - 标注列表：显示已有标注、置信度、来源
- 编码对比页 (`/coding/compare/[id]`)：
  - 并排展示两位编码员的标注结果
  - 可视化显示一致/不一致节点
  - 仲裁视图：第三方裁决差异

### 4.4 双编码与信度检验

- 每篇语料可发起双编码轮次
- 自动计算指标：
  - **Agreement Rate**（整体一致率 + L1一级节点 + L2二级节点分层一致率）
  - **Cohen's Kappa**（标准Kappa + L1分层 + L2分层）
  - **匹配节点数、A独有、B独有**
- 不一致项的仲裁界面
- 历史记录与趋势追踪

### 4.5 统计分析 (`/analytics`)

- 编码分布饼图（按框架节点）
- 时间线趋势图（按研究时段）
- 媒体热力图（媒体 × 时段交叉表）
- 编码员工作统计
- Kappa 一致性趋势图
- 127行页面，组合多个图表组件

### 4.6 文献管理 (`/literature`)

- 参考文献笔记的完整 CRUD
- 文献详情页：摘要、关键观点、研究方法、启发
- 阅读排行榜（统计阅读量）
- 评论系统（支持嵌套回复）
- 点赞/已读反应
- 附件上传（PDF等）
- 导出功能
- AI 文献识别（上传PDF自动提取元数据）

### 4.7 国内媒体分析 (`/domestic`)

- 独立的国内媒体报道语料库
- 上传模块：支持中文媒体语料批量导入
- 采集面板：配置关键词与来源
- 8维AI自动分析（详见第五节）
- 分析仪表盘：各维度结果可视化呈现
- 语料详情页：单篇分析结果查看

### 4.8 终端助手 "小外" (`/companion`)

- 浮动可拖拽的AI对话面板
- 上下文感知：自动注入当前页面信息、用户角色、项目状态
- 学术警告免责声明
- 移动端自适应布局
- 品牌化角色设计（橙子主题SVG形象）
- 内置20+彩蛋关键词（"橙子王"等趣味互动）

### 4.9 学术研讨论坛 (`/defense`)

- 219行页面，研究观点的碰撞与讨论
- 支持论点发布、评论、引用

### 4.10 系统设置 (`/settings`)

- AI Prompt 模板管理（system prompt + user prompt template）
- 翻译工具集成
- 引用格式工具
- 系统配置

---

## 五、AI 分析能力矩阵

### 5.1 英语媒体分析（9维，面向主流外媒）

| 序号 | 功能 | 理论依据 | Schema校验 | 输出类型 |
|------|------|---------|-----------|---------|
| 1 | 摘要生成 (EN) | — | — | string |
| 2 | 摘要生成 (ZH) | — | — | string |
| 3 | 情感分析 | Pang & Lee | Zod enum | sentiment + confidence |
| 4 | 框架建议 | Entman | Zod enum | threat/opportunity/problem/neutral + evidence |
| 5 | 术语提取 | 关键词提取 | Zod array | string[] |
| 6 | 语言学特征 | CDA | Zod object | 被动语态/比较修辞/引用类型 |
| 7 | 叙事分析 | 叙事学 | Zod object | 叙事风格+解释+框架策略 |
| 8 | 消息源分析 | van Dijk | Zod object | 源类型分布+具名源+匿名数 |
| 9 | 语气分析 | 情感计算 | Zod enum | critical/constructive/descriptive等5类 |

**技术特征**：
- 所有输出经 Zod Schema 校验，非法JSON自动丢弃
- 基于 OpenAI-compatible SSE 流式API
- 3次自动重试 + 指数退避
- 超时60秒

### 5.2 中文媒体分析（8维，面向国内媒体）

| 序号 | 维度 | 理论依据 | 关键指标 |
|------|------|---------|---------|
| 1 | 议题框架识别 | Entman Framing | 发展成就/风险问题/道德评判/人情味 + 框架策略 |
| 2 | 话语主体分析 | van Dijk | 党政/专家/企业/民众/外媒五大消息源分布 |
| 3 | 政策工具识别 | Rothwell & Zegveld | 管制型/激励型/能力建设型/象征型 |
| 4 | 情感极性与强度 | Pang & Lee | 正向/中性/负向 + 1-5级强度 |
| 5 | 互文性追踪 | Kristeva | 政策文件/领导讲话/历史事件/外媒/典故5类 |
| 6 | 句法正式度 | Halliday | 平均句长/被动句比/政治术语密度/正式度评分 |
| 7 | 叙事视角 | Genette | 宏观vs微观叙事比/全知/记者/引语/混合 |
| 8 | 地域层级指向 | Soja | 中央vs地方/国内vs国际/城市vs农村 |

**技术特征**：
- 8维串行执行（避免API限流），单次分析40-60秒
- 每维独立错误处理，不会单点失败
- 基于严格规则（只识别文本中明确出现的证据，禁止推测）
- 每维包含原文证据片段

### 5.3 AI 预读流水线 (`pre-read-pipeline`)

- 触发时机：语料全文清洗完成后
- 并行执行全部9维英语分析
- 自动写入 ai_summary / ai_sentiment / ai_confidence / ai_framework_hint / ai_evidence_quotes 等字段
- 采用 metadata merge 策略（不覆盖已有的手工编辑数据）
- 完成后自动推进状态：已清洗 → 已预读 → 待编码

### 5.4 AI 模型版本演进

| 时间 | 模型 | 变更说明 |
|------|------|---------|
| 2025 Q1-Q2 | DeepSeek-V3 | 初始AI集成 |
| 2025 Q3-2026 Q2 | MiMo v2.5-pro (小米) | Anthropic Messages API格式 |
| **2026 Q3 (当前)** | **DeepSeek-V4 Flash** | **回归DeepSeek，OpenAI-compatible格式** |

当前正在进行中的变更：从 MiMo API 切换回 DeepSeek-V4，涉及 `.env.example`、`mimo-client.ts`（重命名为通用LLM客户端）、终端助手、国内媒体AI分析等9个文件的更新。

---

## 六、数据采集与处理

### 6.1 采集体系（4路并行）

| 采集源 | 实现文件 | 特点 |
|--------|---------|------|
| **RSS** | `rss-parser.ts` | 直接解析媒体RSS Feed |
| **NewsAPI** | `newsapi-client.ts` | 结构化新闻API |
| **GDELT** | `gdelt-client.ts` | 全球事件数据库，按timespan查询 |
| **搜索引擎** | `serper-client.ts` + `search-engine-client.ts` | Serper.dev + 通用搜索 |

**辅助能力**：
- `keyword-expander.ts`：关键词组合扩展（中英文Trigram + 双向翻译）
- `batch-planner.ts`：大批量采集的分批规划（避免API限流）
- `insert-guard.ts`：三重过滤（时间段 + URL去重 + 批量去重）
- `dedup.ts`：URL归一化与SHA-256 hash去重
- `media-strategy.ts`：媒体源特定策略配置
- `time-filter.ts`：研究时段自动归类

### 6.2 正文提取（5级降级链路）

```
Level 1: Firecrawl API（付费，最高成功率）
   ↓ 失败
Level 2: Readability + JSDOM（开源解析引擎）
   ↓ 失败
Level 3: 直接 fetch + HTML → 纯文本
   ↓ 失败
Level 4: 元数据提取（meta/JSON-LD）
   ↓ 失败
Level 5: 标记为 missing，等待手动上传
```

**辅助模块**：
- `paywall-detector.ts`：付费墙检测
- `text-cleaner.ts`：309行，HTML清洗、文本规范化、中英文引号统一
- `/api/articles/extract/`：单篇提取API
- `/api/articles/batch-clean/`：批量清洗API

### 6.3 采集监控

- 采集作业表（`crawl_jobs`）：进度追踪、分批状态
- 采集日志表（`collection_logs`）：每次采集的源/参数/结果
- 进度反馈API：前端可实时查询采集进度

---

## 七、工程质量现状

### 7.1 代码健康度

| 指标 | 状态 | 说明 |
|------|------|------|
| TypeScript 类型检查 | **通过（0 错误）** | 2026-06-17完成196→0清零 |
| ESLint | **通过** | `npm run lint` 通过 |
| 冒烟测试 | **通过** | `smoke-logic.test.ts` 覆盖 URL归一化/hash/清洗/Kappa |
| 质量门禁 | **已建立** | `npm run check` = typecheck + lint + smoke test |
| 类型系统 | **已收口** | typedInsert/typedUpdate + 完整 Database interface |
| 时段定义 | **单一数据源** | `research-periods.ts` 统一管理7个时段 |

### 7.2 架构优势

1. **Repository 模式**：数据访问层隔离，17个实体模块通过 barrel export 统一导出
2. **Client 注入模式**：同一函数可用于 Browser/Server/Admin 端
3. **Row Level Security**：所有表启用RLS，数据隔离到行级
4. **Middleware 路由守卫**：声明式认证/未认证页面隔离
5. **Zod Schema 校验**：AI输出全部经过类型校验，防止垃圾数据入库
6. **模块化组件**：12个领域分类目录，职责清晰

### 7.3 技术债务（需关注）

| 项目 | 优先级 | 说明 |
|------|--------|------|
| 无自动化测试覆盖业务逻辑 | 高 | 仅有冒烟测试，缺少集成/端到端测试 |
| 无 CI/CD 流水线 | 高 | 质量门禁依赖手动执行 |
| AI 分析无批量异步队列 | 中 | 当前同步执行，大量语料时效率低 |
| 无 API 限流与监控 | 中 | 仅依赖 Supabase 内置限流 |
| 国内媒体采集自动化程度低 | 中 | 相比英文媒体采集链路的成熟度有差距 |

---

## 八、已完成工作清单

### 8.1 核心功能（Sprint 0-4）

- [x] 用户认证系统（Supabase SSR Auth + OTP 邮箱验证 + 角色权限）
- [x] 语料 CRUD + CSV/JSON 批量导入
- [x] 编码框架的树形管理（嵌套集模型）
- [x] AI 辅助编码（自动框架建议 + 人工校验）
- [x] 双编码系统（任务分配 → 独立编码 → 自动计算一致性）
- [x] 统计仪表盘（媒体×时段矩阵 + 编码分布 + 进度追踪）
- [x] 文献管理系统（CRUD + 评论 + 反应 + 附件 + 导出）
- [x] 终端AI助手"小外"（上下文感知对话 + 彩蛋系统）
- [x] 国内媒体分析模块（8维AI分析）
- [x] 数据采集4路并行体系
- [x] 5级降级正文提取

### 8.2 工程治理（2026-06）

- [x] TypeScript 196个错误清零
- [x] 质量门禁体系建立（typecheck / lint / smoke test / check）
- [x] Supabase data-access 类型统一收口
- [x] 研究时段定义单一数据源化
- [x] AI 结构化输出 Zod 校验全覆盖
- [x] pre-read metadata merge 策略
- [x] 终端助手上下文限量加载
- [x] 登录失败后自动注册的安全闸门
- [x] 剩余 ESLint 告警清理

### 8.3 迭代优化（近期）

- [x] 词云图美化
- [x] 数据可视化修复
- [x] 编码区功能优化
- [x] 清洗功能强化
- [x] 采集器优化
- [x] 提取器优化
- [x] 对照修复安全漏洞
- [x] 语言学画像更新
- [x] 统计策略中英文优化
- [x] Trigram 过滤规则（3层防御）
- [x] CSV导入增强
- [x] 学术终端拖动功能
- [x] Portal 渲染

---

## 九、当前进行中的工作

### 9.1 AI模型切换（MiMo → DeepSeek-V4）

**当前状态**：已完成代码修改，待提交/部署

**变更范围**（9个文件）：
- `src/lib/ai/mimo-client.ts`：重命名为通用LLM客户端，API格式从 Anthropic → OpenAI-compatible
- `src/lib/ai/ai-client.ts`：更新 import
- `src/lib/domestic/ai-dimensions.ts`：更新 import
- `src/app/api/terminal/chat/route.ts`：更新终端助手API调用
- `src/app/api/ai/translate/route.ts`、`word-detail/route.ts`：更新
- `src/app/api/literature/recognize/route.ts`：更新
- `src/app/api/tools/prompt/route.ts`：更新
- `.env.example`：环境变量名更新

**技术原因**：
- MiMo API 停止服务或变更，需要切换
- DeepSeek OpenAI-compatible 格式标准性更好
- 统一使用 process.env 配置模型名，灵活切换

### 9.2 两份代码审查报告

项目根目录下存在两份独立的代码审查报告：
- `outsight-code-review/`：v1 版本
- `outsight-code-review-v2/`：v2 版本

均为HTML格式，包含架构图、交互演示和评估建议。

---

## 十、待解决问题与风险

### 10.1 技术层面

| 问题 | 影响 | 建议优先级 |
|------|------|-----------|
| 缺少自动化测试 | 功能回归风险高，无法放心重构 | **P0** |
| 无 CI/CD 流水线 | 每次部署依赖人工检查 | **P1** |
| AI 分析无异步队列 | 大量语料分析时前端超时 | **P1** |
| 环境变量管理分散 | `.env.example` 和 `.env.local` 不一致 | P2 |
| 国内媒体采集链路不成熟 | 自动化程度低于英文侧 | P2 |

### 10.2 科研层面

| 问题 | 影响 | 建议 |
|------|------|------|
| 语料量级（800+篇） | 统计效力可能不足 | 评估效应量与所需样本量 |
| 编码框架理论效度 | 框架是否有效覆盖研究问题 | 考虑框架效度的前测(pilot) |
| AI 与人工编码的校准 | AI 框架分类与人码一致性未知 | 做 AI vs 人工的编码信度对比 |
| 国内-国外对比分析路径 | 双轨数据尚未形成系统的对比分析方法论 | 需明确两类数据的使用场景 |

---

## 十一、下一步科研方向建议

### 方向一：编码框架的实证验证

**当前状态**：编码框架基于理论推导构建，尚未经过系统的实证验证。

**建议步骤**：
1. 选取30-50篇代表性语料作为 pilot sample
2. 2-3位编码员独立编码，计算初始 Kappa
3. 根据不一致项修订框架定义和节点说明
4. 重复直至达到 Kappa ≥ 0.7 标准
5. 形成《编码手册》(Codebook)，提升研究的可复现性

### 方向二：AI辅助编码的效度研究

**平台优势**：已有完整的AI分析与人工编码双轨数据。

**研究问题**：
- DeepSeek-V4 的框架分类与人类编码员的一致性如何？
- AI 在哪些维度（框架类型/情感/语气）上更接近人类判断？
- AI 预标注能否加速人工编码（人机协作效率实验）？

**方法**：将 AI 框架建议结果与已完成的人工编码标注进行对比，计算 AI-vs-Human Kappa，识别 AI 的强项和弱项维度。

### 方向三：跨媒体 × 跨时段的话语演变分析

**平台优势**：已有6媒体 × 7时段（2022.10-2025.12）的完整矩阵数据。

**研究问题**：
- 中国式现代化的话语框架在3年跨度内如何演变？
- 不同媒体（如NYT vs Guardian）的话语策略是否存在系统性差异？
- 重大事件（如两会、峰会）对报道框架的影响

### 方向四：中英媒体话语的对比分析

**平台优势**：已有英文（800+篇）和中文国内媒体的双轨数据 + 各自独立的AI分析维度。

**研究问题**：
- 同一议题（如"一带一路""共同富裕"）在中英媒体中的框架差异
- 消息源类型分布的跨文化差异
- 互文性策略的中英对比

**技术准备**：
- 需要建立中英对齐的议题关键词库
- 需要统一或桥接两套分析维度的输出格式

### 方向五：方法论贡献——从工具到方法

**建议**：除了实质性话语研究发现外，平台本身的方法论贡献也值得单独阐述：

- 如何将 AI 大模型整合到话语分析的编码工作流中
- 双编码员 + AI 预标注的研究设计信度
- 整套工具链的可复现性（开源、标准化数据格式）

可考虑撰写方法论论文，投稿至：
- *Discourse Studies* / *Discourse & Communication*
- *Digital Scholarship in the Humanities*
- *Computational Communication Research*

### 方向六：语料量级扩展

**当前瓶颈**：800+ 篇对于统计推断可能不足。建议：

1. **扩展数据源**：增加 CNN、Reuters、AP、AI Jazeera 等
2. **扩展时间窗口**：前推至 2020 或后延至 2026
3. **利用 GDELT**：已集成的 GDELT 采集链路可做大规模采集
4. **样本量评估**：先做 power analysis 确定所需最小样本量

---

## 附录

### A. 数据库表清单（14张）

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `profiles` | 用户扩展信息 | role, research_roles, institution |
| `coding_frameworks` | 编码框架 | name, name_zh, version, is_active |
| `coding_nodes` | 编码节点（嵌套集） | framework_id, parent_id, code, lft, rgt |
| `articles` | 语料库 | title, url, media, status, period, full_text, ai_* |
| `annotations` | 编码标注 | article_id, node_id, coder_id, quote_text |
| `assignments` | 任务分配 | article_id, assignee_id, status, priority |
| `collection_logs` | 采集日志 | source, query_params, articles_fetched |
| `activity_logs` | 操作审计 | action, entity_type, user_id |
| `ai_queue` | AI任务队列 | job_type, status, payload, result |
| `ai_prompts` | Prompt模板 | system_prompt, user_prompt_template |
| `crawl_jobs` | 爬虫作业 | status, progress, batch_index |
| `dual_coding_rounds` | 双编码轮次 | article_id, coder_a/b, kappa |
| `coding_tasks` | 任务池 | article_id, task_type, coder_a/b, status |
| `literature_notes` | 文献笔记 | title, author, journal, key_points, inspiration |
| `literature_comments` | 文献评论 | note_id, author_id, parent_id |
| `literature_reactions` | 文献反应 | note_id, reaction_type (read/like) |

### B. API 路由清单（按领域）

| 领域 | 路由数 | 主要功能 |
|------|--------|---------|
| AI 分析 | 5 | pre-read, translate, word-detail |
| 文章管理 | 6 | CRUD, batch, upload, extract, completion-stats |
| 标注管理 | 3 | CRUD, batch |
| 认证 | 5 | login, logout, change-password, delete-account, OTP |
| 采集 | 4 | start, execute, execute-batch, status |
| 仪表盘 | 1 | stats |
| 国内媒体 | 6 | articles CRUD, upload, analyze, stats, linguistic-profile |
| 双编码 | 3 | CRUD, arbitrate, calculate |
| 编码框架 | 3 | frameworks CRUD, nodes CRUD |
| 语言学 | 1 | analyze |
| 文献 | 8 | CRUD, comments, react, upload, export, stats, reading-rank |
| 任务管理 | 5 | CRUD, claim, submit, review |
| 终端助手 | 1 | chat |
| 工具 | 4 | citation, export, prompt, translate |
| 搜索 | 1 | discover |
| 同步 | 2 | sync, status |

### C. 文件行数统计（关键模块）

| 模块 | 行数 |
|------|------|
| 数据库类型定义 | 747 |
| 内容提取器 | 400 |
| 编码详情页 | 386 |
| 文本清洗器 | 309 |
| 英语语言学分析 | 275 |
| AI 分析客户端 | 213 |
| 插入守卫 | 235 |
| 终端助手聊天路由 | ~300 |
| 国内8维AI分析 | 391 |
| Cohen's Kappa 计算 | 161 |

---

> *报告完毕。*
> *OutEye 外眼 2.0 — 让话语研究更高效、更严谨、更可复现。*
