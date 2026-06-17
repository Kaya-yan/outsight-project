# 发现与决策

## 需求
- 基于当前 OutSight 项目代码，出具完整优化方案。
- 方案范围包含：TypeScript 类型治理、Supabase data-access 统一、统计模块可信度、测试与质量门禁、采集/清洗/AI 预读稳定性、period/timespan 单一数据源、auth/终端助手/文献/国内媒体模块的中期治理。
- 当前只输出方案，不执行代码修改。

## 研究发现
- 项目是 Next.js 14 + React 18 + TypeScript + Supabase + Zustand 的研究协作平台。
- 核心业务链路已形成闭环：语料采集 → 清洗入库 → AI 预读 → 编码协作 → 双编码信度 → 统计分析 → 文献管理。
- 采集体系较强：RSS / NewsAPI / GDELT / Search 四源并行，正文提取为五级降级链路。
- 工程健康度明显落后于产品能力：`npx tsc --noEmit` 当前报错数为 196。
- Supabase 类型推断问题在多个路由扩散，已通过 `typedInsert` / `typedUpdate` 局部缓解，但未系统收口。
- 统计模块曾受 Supabase 返回行数上限影响，说明统计可信度需要单独治理。
- Dashboard 中仍存在 placeholder 逻辑，如 mini matrix 当前并非真实交叉表。
- 项目缺少自有测试文件，`package.json` 中也没有 `test` / `typecheck` 脚本。
- period / timespan 存在多处重复定义，已经在 2025 时段扩展中暴露同步维护风险。
- 终端助手会在请求时拼接大量上下文（全量文献笔记、团队成员、项目计划摘要），有后续性能与上下文膨胀风险。
- P0 已完成：TypeScript 已清零；dashboard 语料矩阵改为真实 media × period 交叉表；新增 `typecheck` / `test:smoke` / `check` 质量门禁并通过。
- P1/P2 已完成：period/timespan 进入共享定义文件；AI 结构化输出改为 zod 校验；pre-read metadata 改为 merge；终端助手上下文做限量加载；登录失败后的自动注册增加错误类型闸门。

## 技术决策
| 决策 | 理由 |
|------|------|
| 将优化分为 P0、P1、P2 三层 | 先解决工程基线与可信度，再处理中期结构问题 |
| 将 TypeScript 清零列为首个执行阶段 | 它是当前所有后续治理的前置条件 |
| 将 Supabase 查询策略纳入单独治理项 | 类型、分页、聚合、统计口径问题都与此耦合 |
| 将统计模块独立为一条工作流 | 统计可信度直接影响平台输出质量 |
| 将测试门禁作为平台能力而非附属工作 | 没有门禁，之后的修复会不断回归失稳 |

## 遇到的问题
| 问题 | 解决方案 |
|------|---------|
| 技能要求使用持久化规划文件，但项目中不存在规划文件 | 已按模板初始化 task_plan.md / findings.md / progress.md |

## 资源
- `src/lib/data-access/base.ts`：Supabase typedInsert / typedUpdate 基础封装
- `src/lib/data-access/dashboard.ts`：Dashboard 聚合与分页拉全量的现行治理样例
- `src/app/api/analytics/route.ts`：统计路由
- `src/lib/insert-guard.ts`：时间过滤与批量去重
- `src/lib/content-extractor.ts`：正文提取五级链路
- `src/lib/ai/pre-read-pipeline.ts`：AI 预读入库
- `src/lib/stats/agreement.ts`：Cohen’s Kappa 与编码一致性
- `src/app/api/terminal/chat/route.ts`：终端助手上下文构建

## 视觉/浏览器发现
- 本次任务未使用浏览器或视觉工具。

---
*每执行2次查看/浏览器/搜索操作后更新此文件*
*防止视觉信息丢失*
