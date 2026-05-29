# OutSight（外眼 2.0）数据采集、处理、分析与可视化完整报告

> 本报告面向研究生讲座，系统阐述 OutSight 平台在数据采集、内容处理、AI 分析、人工编码、可视化呈现和数据利用方面的完整技术实现与研究方法论。

---

## 目录

1. [项目背景与研究设计](#一项目背景与研究设计)
2. [数据采集体系](#二数据采集体系)
3. [内容提取与文本清洗](#三内容提取与文本清洗)
4. [AI 预读分析系统](#四ai-预读分析系统)
5. [人工编码与标注系统](#五人工编码与标注系统)
6. [编码员信度检验](#六编码员信度检验)
7. [可视化策略与实现](#七可视化策略与实现)
8. [数据利用与分析路径](#八数据利用与分析路径)
9. [研究工具箱](#九研究工具箱)
10. [AI 技术融合总结](#十ai-技术融合总结)
11. [技术架构与工程实践](#十一技术架构与工程实践)

---

## 一、项目背景与研究设计

### 1.1 研究问题

OutSight（外眼 2.0）是一个面向话语研究的学术协作平台，核心研究议题是：**英语主流媒体如何报道和建构"中国式现代化"话语？**

研究的理论根基植根于：
- **批评话语分析（CDA）**：Fairclough 的三维话语分析模型（文本—话语实践—社会实践）
- **框架理论（Framing Theory）**：媒体如何通过选择、强调、排除来建构现实
- **内容分析法**：系统化的定量编码与统计推断
- **媒体社会学**：媒体机构、消息来源与话语生产的关系

### 1.2 研究对象

| 维度 | 具体内容 |
|------|----------|
| **媒体来源** | 6 家英语主流媒体：NYT、WP、WSJ、Guardian、Economist、BBC |
| **时间窗口** | 2022 年 10 月 — 2024 年 12 月 |
| **研究时段** | 5 个半年周期（2022.10-2023.03, 2023.04-2023.09, 2023.10-2024.03, 2024.04-2024.09, 2024.10-2024.12） |
| **语料规模** | 800+ 篇已入库文章，覆盖 6 媒体 × 5 时段的完整矩阵 |
| **研究团队** | 山东大学，约 5 人（含管理员、研究员、编码员） |

### 1.3 研究设计框架

```
┌─────────────────────────────────────────────────────────────────────┐
│                        研究设计总体框架                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  第一阶段：语料采集                                                  │
│  ├─ 四源自动化采集（RSS + NewsAPI + GDELT + 搜索引擎）                │
│  ├─ 时间过滤 + URL 去重                                              │
│  └─ 全文提取 + 文本清洗                                              │
│                                                                     │
│  第二阶段：AI 预读                                                   │
│  ├─ 9 维度并行分析（摘要/情感/框架/术语/语言/叙事/信源/语调）           │
│  └─ 结果写入数据库，供编码员参考                                      │
│                                                                     │
│  第三阶段：人工编码                                                   │
│  ├─ 层级编码框架（一级/二级节点）                                     │
│  ├─ 单人编码 + 双人编码                                              │
│  └─ Cohen's Kappa 信度检验 + 仲裁                                    │
│                                                                     │
│  第四阶段：数据分析与可视化                                           │
│  ├─ 定量分析：框架分布、情感趋势、媒体比较                            │
│  ├─ 定性分析：叙事模式、信源策略、语言特征                            │
│  └─ 多维可视化：热力图、饼图、时间线、Kappa 分布                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、数据采集体系

### 2.1 四大数据源详解

#### 2.1.1 RSS 订阅源

**技术实现：** 自研正则 XML 解析器（`src/lib/rss-parser.ts`），无外部 XML 库依赖。

| Feed | URL | 内容 |
|------|-----|------|
| BBC World | `feeds.bbci.co.uk/news/world/rss.xml` | BBC 国际新闻 |
| BBC Business | `feeds.bbci.co.uk/news/business/rss.xml` | BBC 商业新闻 |
| Guardian World | `theguardian.com/world/rss` | Guardian 国际新闻 |

**相关性过滤：** `isRelevant()` 函数检查标题是否包含关键词：china, chinese, beijing, xi jinping, modernization, common prosperity, belt and road, bri, development。

**局限性：** RSS 仅覆盖 BBC 和 Guardian 两家开放媒体，且依赖标题关键词匹配，可能遗漏标题不含关键词但内容相关的文章。

#### 2.1.2 NewsAPI

**技术实现：** `src/lib/newsapi-client.ts`，调用 `newsapi.org/v2/everything` 接口。

```typescript
// 查询策略
query: "China modernization"
sources: "nytimes.com, washingtonpost.com, wsj.com, theguardian.com, economist.com, bbc.com"
pageSize: 50
language: "en"
sortBy: "publishedAt"
```

**来源映射：** `mapSource()` 函数将 NewsAPI 返回的 source name 标准化为 6 家媒体代码（NYT, WP, WSJ, Guardian, Economist, BBC）。

**优势：** 覆盖全部 6 家媒体，返回结构化数据（标题、URL、发布日期、描述）。
**局限：** 免费版有请求频率限制，且 "China modernization" 单一查询可能遗漏相关但措辞不同的文章。

#### 2.1.3 GDELT 全球事件数据库

**技术实现：** `src/lib/gdelt-client.ts` + 内联 `queryGdeltAllOutlets()` 函数。

**API 端点：** `https://api.gdeltproject.org/api/v2/doc/doc`

**关键词体系：** 20 组精心设计的关键词组合（`src/lib/gdelt-keywords.ts`）：

| 层级 | 数量 | 示例 |
|------|------|------|
| Tier 1（高信号） | 10 组 | "Chinese modernization", "Xi Jinping modernization", "China development model" |
| Tier 2（扩展） | 10 组 | "common prosperity China", "Belt and Road Initiative", "China poverty alleviation" |

**查询模式：**
- 使用 `domain:` 过滤器限定媒体域名
- 每次查询最多返回 250 条记录
- 1.5 秒请求间隔（遵守 API 限制）
- 5 个时段 × 10 组关键词 = 50 次查询/完整轮次

**日期解析：** 从 GDELT 的 `seendate` 字段（格式：YYYYMMDDHHMMSS）提取发布日期。

#### 2.1.4 搜索引擎发现

**技术实现：** `src/lib/search-engine-client.ts`，多引擎降级链。

```
auto 模式：Bing → Serper → Google CSE（依次降级）
```

| 引擎 | API | 特点 |
|------|-----|------|
| Bing | `api.bing.microsoft.com/v7.0/search` | 稳定，覆盖面广 |
| Serper | `google.serper.dev/search` | Google 结果代理，支持 `tbs` 日期范围限制 |
| Google CSE | `googleapis.com/customsearch/v1` | 自定义搜索引擎，精准度高 |

**查询生成：** `src/lib/keyword-expander.ts` 中的 `expandSearchQueries()` 函数：
- 26 个关键词（Tier 1 + Tier 2 + Tier 3）× 6 家媒体域名
- 使用 `site:` 操作符限定搜索范围
- 生成 156 个查询，分 16 批执行（每批 6 个查询）

### 2.2 批次架构设计

**问题：** Vercel 无服务器函数有 ~8 秒超时限制，单次全量采集必然超时。

**解决方案：前端驱动的批次架构**

```
用户点击"开始采集"
       ↓
POST /api/crawl/start
  └─ generateBatchPlan() 生成 ~37 个批次计划
       ↓
前端循环调用 POST /api/crawl/execute-batch（每批 ~8 秒）
  ├─ Batch 0:    RSS + NewsAPI（并行获取）
  ├─ Batch 1-20: GDELT（每批 3 组关键词 × 1 时段，~6 秒）
  ├─ Batch 21-36: 搜索引擎（每批 6 个查询，~7 秒）
  └─ Batch 37:   flush（收尾确认）
       ↓
每批内部流程：
  采集候选文章 → batchGuardCheck() → 通过的文章写入数据库
```

**批次计划生成器（`src/lib/batch-planner.ts`）：**
- 每个批次有 type（rss_newsapi/gdelt/search/flush）、label、status
- 前端通过 `advanceBatch()` 推进进度
- `addFetchedCount()` / `addInsertedCount()` 追踪采集/入库统计

### 2.3 入库守卫系统

**双条件过滤（`src/lib/insert-guard.ts`）：**

每篇候选文章入库前必须通过两道检查：

```typescript
async function checkArticleBeforeInsert(client, article): Promise<GuardResult> {
  // 1. 时间过滤
  const timeCheck = isWithinResearchPeriod(article.publish_date);
  if (!timeCheck.valid) return { passed: false, reason: timeCheck.reason };

  // 2. URL 去重
  const normalized = normalizeUrl(article.url);
  const urlHash = hashUrl(normalized);  // SHA-256
  const existing = await client.from("articles").select("id").eq("url_hash", urlHash);
  if (existing.length > 0) return { passed: false, reason: "duplicate_url" };

  return { passed: true, urlHash };
}
```

**URL 标准化规则（`src/lib/dedup.ts`）：**
- 去除尾部斜杠
- 剥离追踪参数：utm_source, utm_medium, utm_campaign, utm_term, utm_content, fbclid, ref
- 排序剩余查询参数
- 转小写

**过滤原因分类：**
- `passed` — 通过
- `duplicate_url` — URL 重复
- `out_of_date_range_before` / `out_of_date_range_after` — 日期超出范围
- `missing_publish_date` — 缺少发布日期
- `unparseable_date` — 日期无法解析

---

## 三、内容提取与文本清洗

### 3.1 全文提取流水线

**入口：** `POST /api/articles/extract` → `extractContent(url)` 函数（`src/lib/content-extractor.ts`）

```
URL 输入
  ↓
fetch（15 秒超时，2MB 上限，User-Agent: OutSight/1.0）
  ↓
JSDOM 解析 HTML
  ↓
预清洗：移除 <script>, <style>, <noscript>, <iframe>, <nav>, <footer>
  ↓
Mozilla Readability 提取正文
  ├─ 成功 → 返回 HTML 片段（parsed.content）
  └─ 失败 → 回退到 body.textContent
  ↓
cleanHtml()：移除社交媒体嵌入 + 广告/导航残留
  ↓
htmlToPlainText()：按块级元素保留段落结构
  ↓
cleanText()：版权截断 + 空白规范化
  ↓
元数据提取：author（meta/JSON-LD）、publishDate（meta/JSON-LD）
  ↓
返回 ExtractionResult { content, fullText, author, publishDate, wordCount }
```

### 3.2 文本清洗策略

**清洗模块：** `src/lib/text-cleaner.ts`，三个导出函数。

#### 3.2.1 HTML 清洗（`cleanHtml`）

**社交媒体嵌入移除：** 按 class 名匹配移除以下嵌入块：
- `twitter-tweet`, `instagram-media`, `fb-post`, `fb-video`
- `tiktok-embed`, `reddit-embed`, `youtube-embed`

**广告/导航残留过滤：** 遍历块级节点（p, div, section, aside, nav 等），若节点文本 < 200 字符且包含黑名单关键词，则整块移除。黑名单包含 40+ 个中英文关键词：
- 英文：advertisement, related stories, follow us, sign up for, read more, editors' picks, sponsored, most popular, newsletter, download the app...
- 中文：广告, 相关阅读, 推荐阅读, 关注我们, 订阅, 热门推荐, 猜你喜欢...

**保守原则：** 仅移除短块节点（<200 字符），长段正文即使包含 "read more" 也不会被误删。

#### 3.2.2 HTML → 纯文本转换（`htmlToPlainText`）

**DOM 遍历策略：** 递归遍历 DOM 树，按块级元素插入换行符：
- `<p>`, `<div>`, `<section>`, `<h1>`-`<h6>`, `<blockquote>`, `<li>` 等 → 内容 + 双换行
- `<br>` → 单换行
- `<script>`, `<style>`, `<noscript>` → 跳过
- 内联元素 → 直接拼接文本

**优势：** 不依赖 `innerText`（会丢失换行结构），精确控制段落间距。

#### 3.2.3 纯文本清洗（`cleanText`）

**文末版权/署名截断：** 扫描末尾 6 行，匹配以下模式则截断：
- `©\d{4}`、`All rights reserved`、`Copyright`
- `Distributed by`、`Published by`
- `AP News`、`Reuters`、`AFP`、`Dow Jones Newswires`
- `This article was originally published in/by/on`

**尾部署名移除：** 短行（<80 字符）以 `—`、`–` 开头或 `By [大写字母]` 开头的行。

**空白规范化：**
- 全角空格（　）→ 半角空格
- 连续 3+ 换行 → 双换行
- 连续空格 → 单个空格
- 行尾空白 trim

### 3.3 付费墙检测

**模块：** `src/lib/paywall-detector.ts`

**双条件判定：**
```
word_count < 800 AND 包含付费关键词 → paywalled（付费墙）
word_count < 800 但无付费关键词    → partial（短文章，非付费墙）
word_count ≥ 800                   → 正常
```

**付费关键词（30+）：** subscribe, subscription, sign in, members only, premium content, continue reading, unlock this article, create an account, become a member, start your free trial, already a subscriber...

**媒体策略分级（`src/lib/media-strategy.ts`）：**

| 策略 | 媒体 | 说明 |
|------|------|------|
| 开放（open） | BBC, Guardian | 全文可直接获取 |
| 软付费墙（soft_paywall） | NYT, WP | 部分内容可获取，可能需要清除 Cookie |
| 硬付费墙（hard_paywall） | WSJ, Economist | 通常只能获取摘要或开头几段 |

### 3.4 批量清洗功能

**问题：** 新清洗逻辑只对新抓取的文章生效，已入库的 800+ 篇文章仍是未清洗的原始 Readability 输出。

**解决方案：** `GET /api/articles/batch-clean` 批量清洗 API。

**流程：**
1. 查询 `full_text IS NOT NULL AND full_text_status IN ('complete','partial') AND metadata->>'cleaned_at' IS NULL`
2. 逐篇调用 `cleanHtml()` + `cleanText()`
3. 安全机制：清洗后字数下降 >80% 且原文 >100 词 → 标记 `metadata.needs_review`，不覆盖
4. 每篇处理后写入 `metadata.cleaned_at` 时间戳，避免重复清洗
5. 前端轮询：每 2 秒调用一次，每批 50 篇，实时显示进度

---

## 四、AI 预读分析系统

### 4.1 系统架构

AI 预读是 OutSight 的核心创新之一：在人工编码之前，先用 AI 对文章进行多维度分析，为编码员提供参考，减少主观偏差，提高编码效率。

```
文章（已清洗状态）
       ↓
POST /api/ai/pre-read { articleId }
       ↓
runPreReadPipeline()（src/lib/ai/pre-read-pipeline.ts）
       ↓
Promise.all([9 个分析函数并行执行])
       ↓
结果写入数据库
  ├─ 直接字段：ai_summary, ai_sentiment, ai_confidence, ai_framework_hint, ai_evidence_quotes
  └─ metadata JSON：ai_terms, ai_linguistic, ai_summary_zh, ai_narrative, ai_sources, ai_tone
       ↓
状态推进：当前状态 → 已预读 → 待编码
```

### 4.2 AI 模型配置

| 配置项 | 值 |
|--------|-----|
| 主力模型 | MiMo v2.5 Pro（小米 Anthropic 代理） |
| 备用模型 | DeepSeek Chat |
| API 格式 | OpenAI 兼容（`/chat/completions`） |
| Temperature | 0.3（低随机性，保证一致性） |
| Max Tokens | 512（默认）/ 256（摘要）/ 128（情感） |
| 输入截断 | 4000 字符（避免超长输入） |
| 重试策略 | 3 次指数退避（1s, 2s, 3s） |
| 超时 | 60 秒/请求 |

### 4.3 九维度分析详解

#### ① 英文摘要（`summarize`）

**Prompt：** "You are a research assistant. Summarize the article in under 150 words in English. Focus on the main argument."

**输出：** 150 词以内的英文摘要，聚焦主要论点。
**存储：** `articles.ai_summary`

#### ② 中文摘要（`summarizeZh`）

**Prompt：** "你是一名学术研究助手。请用中文概括以下英文文章的核心内容，不超过150字。"

**输出：** ~150 字中文概述。
**存储：** `articles.metadata.ai_summary_zh`

#### ③ 情感分析（`analyzeSentiment`）

**Prompt：** "You are a sentiment analyst. Output ONLY valid JSON: {"sentiment":"positive"|"negative"|"neutral","confidence":0.0-1.0}"

**输出结构：**
```json
{
  "sentiment": "negative",
  "confidence": 0.85
}
```

**存储：** `articles.ai_sentiment`（情感标签）、`articles.ai_confidence`（置信度）

**应用场景：** 跨媒体情感比较、情感趋势分析、情感与框架的关联分析。

#### ④ 框架分类（`suggestFramework`）

**Prompt：** "Classify the article's framing of Chinese modernization as: threat / opportunity / problem / neutral. Provide confidence (0-1) and 1-2 evidence quotes."

**输出结构：**
```json
{
  "framework": "threat",
  "confidence": 0.78,
  "evidence": [
    "Beijing's aggressive expansion into developing markets...",
    "The authoritarian model poses risks to democratic institutions..."
  ]
}
```

**存储：** `articles.ai_framework_hint`（框架 + 情感组合）、`articles.ai_evidence_quotes`（证据引文）

**应用场景：** 框架分布统计、框架随时间演变、框架与媒体立场的关联。

#### ⑤ 术语提取（`extractTerms`）

**Prompt：** "Extract key terms and phrases related to Chinese modernization discourse. Output as JSON array of strings."

**输出示例：** `["Chinese modernization", "common prosperity", "Belt and Road Initiative", "development model", "authoritarian capitalism"]`

**存储：** `articles.metadata.ai_terms`

**应用场景：** 话语关键词图谱、术语演变追踪、跨媒体术语使用比较。

#### ⑥ 语言特征分析（`linguisticCheck`）

**Prompt：** "Analyze linguistic features: passive voice examples, comparative rhetoric, citation types. Output as JSON."

**输出结构：**
```json
{
  "passiveVoice": ["was described as", "has been characterized by"],
  "comparativeRhetoric": ["unlike Western democracies...", "compared to China's approach..."],
  "citationTypes": {
    "official": 3,
    "expert": 5,
    "anonymous": 2
  }
}
```

**存储：** `articles.metadata.ai_linguistic`

**应用场景：** 被动语态使用分析（隐性立场表达）、比较修辞模式识别、引用类型分布。

#### ⑦ 叙事分析（`analyzeNarrative`）

**Prompt：** "Analyze the narrative style: conflict-driven / hero-villain / victimhood / problem-solution / data-driven / human-interest / episodic / thematic. Identify framing devices and story arc."

**输出结构：**
```json
{
  "narrativeStyle": "conflict-driven",
  "framingDevices": ["us vs them", "economic threat framing", "ideological competition"],
  "storyArc": "rising tension with unresolved conclusion"
}
```

**存储：** `articles.metadata.ai_narrative`

**应用场景：** 叙事模式分类统计、框架手法识别、叙事策略跨媒体比较。

#### ⑧ 信源分析（`analyzeSources`）

**Prompt：** "Analyze source attribution: count official/expert/public/anonymous/media/corporate sources. List named sources."

**输出结构：**
```json
{
  "official": 4,
  "expert": 6,
  "public": 2,
  "anonymous": 3,
  "media": 1,
  "corporate": 0,
  "namedSources": ["Wang Yi (Foreign Minister)", "Scott Kennedy (CSIS)", "Zhang Wei (Peking University)"]
}
```

**存储：** `articles.metadata.ai_sources`

**应用场景：** 话语权分配分析（官方 vs 民间 vs 专家）、匿名信源使用分析、信源多样性评估。

#### ⑨ 语调分析（`analyzeTone`）

**Prompt：** "Classify the tone as: critical / constructive / descriptive / alarming / celebratory. Provide confidence and key tone-indicating words."

**输出结构：**
```json
{
  "tone": "critical",
  "confidence": 0.72,
  "keywords": ["concerns", "challenges", "controversial", "questionable"]
}
```

**存储：** `articles.metadata.ai_tone`

**应用场景：** 语调分布统计、语调与情感的关联分析、语调随时间变化趋势。

### 4.4 AI 预读面板

**组件：** `src/components/coding/ai-panel.tsx`

在编码工作空间中，AI 预读结果以可折叠面板形式呈现给编码员：

```
┌─────────────────────────────────────────────────┐
│ ▼ AI 预读参考                              [收起] │
├─────────────────────────────────────────────────┤
│ 📝 中文摘要                                       │
│ 本文分析了中国式现代化对全球治理体系的影响...       │
│                                                   │
│ 📝 English Summary                               │
│ This article examines how China's modernization   │
│ path challenges the existing global order...      │
│                                                   │
│ 🎯 情感：negative（置信度 85%）                    │
│ 📊 框架：threat（78%）| 问题                      │
│                                                   │
│ 📖 叙事模式：conflict-driven                      │
│    框架手法：us vs them, economic threat framing   │
│                                                   │
│ 🎭 语调：critical（72%）                          │
│    关键词：concerns, challenges, controversial     │
│                                                   │
│ 📡 信源分析                                       │
│ 官方:4 专家:6 公众:2 匿名:3 媒体:1 企业:0         │
│                                                   │
│ 💬 证据引文                                       │
│ "Beijing's aggressive expansion into..."          │
│ "The authoritarian model poses risks..."          │
│                                                   │
│ 📚 术语                                           │
│ Chinese modernization, common prosperity, BRI     │
│                                                   │
│ 🔍 语言特征                                       │
│ 被动语态: was described as, has been characterized │
│ 比较修辞: unlike Western democracies...            │
└─────────────────────────────────────────────────┘
```

**设计原则：** AI 结果是"参考"而非"答案"。编码员可以借鉴 AI 的分析框架和证据引文，但最终编码决策由人工做出。

### 4.5 AI 与人工编码的协作模式

```
┌─────────────────────────────────────────────────────────────┐
│                    AI-人工协作编码流程                         │
│                                                             │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐            │
│  │ 文章清洗  │ ──→ │ AI 预读   │ ──→ │ 人工编码  │            │
│  │          │     │ 9维分析   │     │ 参考AI结果│            │
│  └──────────┘     └──────────┘     └──────────┘            │
│                                      ↓                      │
│                               ┌──────────┐                  │
│                               │ 双人编码  │                  │
│                               │ 信度检验  │                  │
│                               └──────────┘                  │
│                                      ↓                      │
│                               ┌──────────┐                  │
│                               │ 仲裁/共识 │                  │
│                               └──────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**AI 的角色：**
- **辅助者**：提供情感/框架/叙事的初步判断，供编码员参考
- **效率工具**：自动提取证据引文、术语、信源统计，减少人工阅读负担
- **一致性锚点**：AI 的分析结果可作为编码校验的参考基准

**人工的角色：**
- **决策者**：最终编码决策由人工做出
- **质量控制**：通过双人编码 + Kappa 检验保障信度
- **理论建构**：基于编码数据进行话语分析和理论建构

---

## 五、人工编码与标注系统

### 5.1 编码框架设计

编码框架采用**层级树结构**（nested set model），存储在 `coding_frameworks` 和 `coding_nodes` 表中。

```
编码框架（Framework）
  │
  ├─ 一级节点 A（如：威胁话语）
  │    ├─ 二级节点 A1（如：军事威胁）
  │    ├─ 二级节点 A2（如：经济威胁）
  │    └─ 二级节点 A3（如：技术威胁）
  │
  ├─ 一级节点 B（如：机遇话语）
  │    ├─ 二级节点 B1（如：经济合作）
  │    └─ 二级节点 B2（如：技术交流）
  │
  ├─ 一级节点 C（如：问题话语）
  │    ├─ 二级节点 C1（如：人权问题）
  │    └─ 二级节点 C2（如：环境问题）
  │
  └─ 一级节点 D（如：中性报道）
       ├─ 二级节点 D1（如：数据驱动）
       └─ 二级节点 D2（如：事件报道）
```

**节点属性：**
- `code`：编码代号（如 "threat_military"）
- `label` / `label_zh`：中英文标签
- `description`：编码说明
- `color`：颜色标记（用于可视化）
- `parent_id`：父节点 ID（null 表示一级节点）
- `lft` / `rgt`：嵌套集模型的左右值（支持高效层级查询）

### 5.2 编码工作流

#### 5.2.1 单人编码（Solo Coding）

```
1. 从任务列表领取文章（或由管理员分配）
2. 进入编码工作空间（/coding/[id]）
3. 阅读全文（左侧文本面板）
4. 选中文本片段 → 选择编码节点 → 填写置信度（1-5）+ 备注 → 提交标注
5. 可参考 AI 预读面板的分析结果
6. 可使用翻译助手查询生词或翻译段落
7. 完成所有标注后提交任务
```

#### 5.2.2 双人编码（Dual Coding）

```
1. 管理员创建双人编码任务，分配两名编码员
2. 两名编码员独立编码同一篇文章
3. 系统自动计算编码一致性（agreement rate + Cohen's Kappa）
4. 若一致性达标（Kappa ≥ 0.6）→ 任务完成
5. 若一致性不达标 → 进入仲裁流程
```

#### 5.2.3 仲裁流程

```
1. 进入仲裁视图（/coding/compare/[id]）
2. 并排显示两名编码员的标注
3. 逐条查看分歧：
   - 编码员 A 选了节点 X，编码员 B 选了节点 Y
   - 仲裁者选择采纳 A 或 B 的意见
4. 达成共识后，任务标记为 "arbitrated"
```

### 5.3 标注数据结构

每条标注（annotation）包含：

| 字段 | 类型 | 说明 |
|------|------|------|
| `article_id` | UUID | 关联文章 |
| `node_id` | UUID | 编码节点 |
| `coder_id` | UUID | 编码员 |
| `quote_text` | text | 选中的文本片段 |
| `start_offset` | int | 起始位置 |
| `end_offset` | int | 结束位置 |
| `confidence` | int (1-5) | 置信度 |
| `note` | text | 编码备注 |
| `task_id` | UUID | 关联任务 |

### 5.4 任务管理

**任务类型：**
- **Solo（单人）**：一名编码员独立完成
- **Dual（双人）**：两名编码员独立编码 + 信度检验

**任务状态流：**
```
open → in_progress → completed → reviewed
```

**任务池机制：** 管理员可以创建开放任务（不指定编码员），编码员从任务池中自行领取。

---

## 六、编码员信度检验

### 6.1 信度指标体系

**模块：** `src/lib/stats/agreement.ts`

| 指标 | 公式 | 含义 |
|------|------|------|
| 一致率（Agreement Rate） | 匹配节点数 / 总节点数 | 两人选择相同编码节点的比例 |
| 一级节点一致率 | 仅计算顶层节点 | 框架大类的一致性 |
| 二级节点一致率 | 仅计算子节点 | 细分编码的一致性 |
| Cohen's Kappa | (Po - Pe) / (1 - Pe) | 排除偶然一致的标准化指标 |

### 6.2 Cohen's Kappa 计算详解

**公式：** κ = (Po - Pe) / (1 - Pe)

- **Po（观察一致率）：** 两人实际选择相同节点的比例
- **Pe（期望一致率）：** 若两人随机编码，预期一致的比例

**实现细节：**
```typescript
// Po：对每个节点，取两人选择比例的较小值之和
for (nodeId of allNodeIds) {
  po += Math.min(pA, pB);  // pA = 编码员A选该节点的比例
}

// Pe：对每个节点，取两人选择比例的乘积之和
for (nodeId of allNodeIds) {
  pe += pA * pB;
}

kappa = (po - pe) / (1 - pe);
```

**Kappa 值解读：**

| Kappa 范围 | 等级 | 中文 | 说明 |
|------------|------|------|------|
| < 0 | Poor | 极差 | 不如随机 |
| 0.00 - 0.20 | Slight | 差 | 略好于随机 |
| 0.21 - 0.40 | Fair | 一般 | 有一定一致性 |
| 0.41 - 0.60 | Moderate | 中等 | 中等一致性 |
| 0.61 - 0.80 | Substantial | 良好 | 较高一致性 |
| 0.81 - 1.00 | Almost Perfect | 优秀 | 几乎完全一致 |

### 6.3 可视化呈现

**Kappa 分布图（`src/components/analytics/kappa-chart.tsx`）：**
- 将所有双人编码轮次的 Kappa 值分为 6 个区间
- 柱状图展示各区间频次
- 帮助识别信度分布的整体趋势

**仲裁视图（`src/components/coding/arbitration-view.tsx`）：**
- 左右并排显示两名编码员的标注
- 匹配项绿色高亮，分歧项红色高亮
- 逐条选择采纳 A 或 B

---

## 七、可视化策略与实现

### 7.1 可视化技术栈

| 技术 | 用途 |
|------|------|
| Recharts 3.8 | 图表库（PieChart, BarChart, ResponsiveContainer） |
| HTML Table | 热力图（CSS 背景色强度编码） |
| Zustand | 状态管理（数据获取与缓存） |
| Tailwind CSS | 样式系统 |
| CSS 动画 | 过渡效果、脉冲动画 |

### 7.2 分析仪表盘（/analytics）

**数据源：** `GET /api/analytics` 聚合查询

#### 7.2.1 框架分布饼图（FrameworkPie）

**组件：** `src/components/analytics/framework-pie.tsx`

**数据来源：** `annotations` 表按 `node_id` 分组计数

**实现逻辑：**
```typescript
// 将 node_id 映射为节点标签
const chartData = Object.entries(data)
  .map(([nodeId, count]) => ({
    name: nodeMap.get(nodeId)?.label ?? nodeId.slice(0, 8),
    value: count,
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, 10);  // 取 Top 10
```

**图表配置：**
- PieChart + Pie 组件
- `outerRadius={90}`，标签显示名称和百分比
- 颜色方案：`["#4A90A4", "#5DAD93", "#2D3436", "#E67E22", "#7F8A93", "#A0B4C8"]`
- 标签线颜色：`#95A5A6`

**分析价值：** 识别话语框架的分布模式——哪些框架被最多使用？哪些被忽略？

#### 7.2.2 媒体×时段热力图（MediaHeatmap）

**组件：** `src/components/analytics/media-heatmap.tsx`

**数据来源：** `articles` 表按 `media` × `period` 交叉分组计数

**实现逻辑：**
```typescript
// 计算全局最大值用于强度归一化
const maxVal = Math.max(1, ...allValues);

// 单元格背景色：rgba(74, 144, 164, 0.05 + (count / maxVal) * 0.5)
// 颜色强度与数量成正比
```

**呈现形式：** 6 行（媒体）× 5 列（时段）的 HTML 表格，单元格背景色深浅表示文章数量。

**分析价值：**
- 识别报道密度分布——哪些媒体在哪些时段报道最多？
- 发现报道空白——哪些媒体×时段组合缺乏覆盖？
- 追踪报道趋势——报道密度是否随时间变化？

#### 7.2.3 时间线柱状图（TimelineChart）

**组件：** `src/components/analytics/timeline-chart.tsx`

**数据来源：** 同热力图，但按时段维度聚合

**图表配置：**
- Stacked BarChart（堆叠柱状图）
- X 轴：5 个研究时段（简写为 "22.10", "23.04" 等）
- Y 轴：文章数量
- 每种颜色代表一家媒体
- 圆角柱体：`radius={[4, 4, 0, 0]}`

**分析价值：**
- 识别报道趋势——哪些时段整体报道量增加？
- 比较媒体差异——不同媒体的报道节奏是否一致？
- 发现事件驱动峰值——特定事件是否导致报道量激增？

#### 7.2.4 编码员工作量统计（CoderStats）

**组件：** `src/components/analytics/coder-stats.tsx`

**数据来源：** `annotations` 表按 `coder_id` 分组计数

**图表类型：** 水平柱状图

**分析价值：** 监控编码进度，平衡工作负载。

#### 7.2.5 Kappa 分布图（KappaChart）

**组件：** `src/components/analytics/kappa-chart.tsx`

**数据来源：** `dual_coding_rounds` 或 `coding_tasks` 表中的 `kappa` 字段

**实现逻辑：**
```typescript
// 将 Kappa 值分为 6 个区间
const bins = [
  { label: "<0", min: -Infinity, max: 0 },
  { label: "0-0.2", min: 0, max: 0.2 },
  { label: "0.2-0.4", min: 0.2, max: 0.4 },
  { label: "0.4-0.6", min: 0.4, max: 0.6 },
  { label: "0.6-0.8", min: 0.6, max: 0.8 },
  { label: "0.8-1", min: 0.8, max: 1.01 },
];
```

**分析价值：**
- 评估整体编码质量——大部分编码对的信度如何？
- 识别低信度区间——哪些区间的编码需要改进？
- 追踪信度变化——随时间推移，编码质量是否提升？

### 7.3 工作台仪表盘（/dashboard）

#### 7.3.1 快速统计卡片

- 语料总数（articles 表 count）
- 已编码数（status = "编码完成" 的 count）
- 已预读数（status = "已预读" 的 count）

#### 7.3.2 MediaMatrix 迷你视图

**组件：** `src/components/articles/media-matrix.tsx`

**两种模式：**
- **迷你视图：** 6×5 网格小方块，绿色强度编码数量，点击跳转到筛选后的语料工作台
- **完整视图：** 6×5 表格，带行/列标题，单元格显示具体数字

**交互设计：** 点击单元格 → 跳转到 `/projects?media=NYT&period=2023.04-2023.09`

### 7.4 文献笔记仪表盘（/literature）

**组件：** `src/components/literature/literature-dashboard.tsx`

| 图表 | 类型 | 内容 |
|------|------|------|
| 标签分布 | 水平柱状图 | 各标签的使用频次 |
| 综述用途 | 饼图 | for_review vs 普通笔记 |
| 评分分布 | 柱状图 | 1-5 分的分布 |
| 阅读排行榜 | 列表 | 团队成员阅读量排名（周/月/全部） |

### 7.5 论文答辩页面（/defense）

**专用页面，包含：**
- 关键指标卡片（语料总数、编码完成数、Kappa 均值等）
- 自动生成的方法论描述文本（可一键复制到论文中）
- 框架分布图 + 热力图 + Kappa 图
- JSON 数据一键导出
- 项目冻结按钮（锁定所有数据为只读）

### 7.6 可视化设计原则

| 原则 | 实现 |
|------|------|
| **一致性** | 统一色系（#4A90A4 雾蓝、#5DAD93 薄荷、#2D3436 石墨、#E67E22 琥珀） |
| **可交互** | 热力图单元格可点击跳转，饼图有 Tooltip |
| **响应式** | ResponsiveContainer 自适应容器宽度 |
| **渐进式** | 迷你视图 → 完整视图，按需展开 |
| **无障碍** | 暂无数据时显示友好提示而非空白 |

---

## 八、数据利用与分析路径

### 8.1 定量分析路径

#### 8.1.1 框架分布分析

**数据来源：** `annotations` 表 × `coding_nodes` 表

**分析步骤：**
1. 按节点分组统计标注频次
2. 按一级节点聚合（如：威胁话语 × 篇数）
3. 计算各框架占比
4. 跨媒体/跨时段比较

**研究问题示例：**
- 6 家媒体中，"威胁"框架的使用比例是否显著高于"机遇"框架？
- 不同媒体的框架偏好是否一致？
- 框架分布是否随时间变化（如：在特定政治事件前后）？

#### 8.1.2 情感趋势分析

**数据来源：** `articles.ai_sentiment` + `articles.ai_confidence`

**分析步骤：**
1. 按媒体分组统计 positive/negative/neutral 比例
2. 按时段分组统计情感变化趋势
3. 计算加权情感得分（positive=1, neutral=0, negative=-1，加权 confidence）
4. 绘制时间序列图

**研究问题示例：**
- 哪家媒体的情感倾向最负面？
- 情感是否随时间变化？是否有事件驱动的情感转折点？
- 情感与框架是否相关（如：威胁框架是否伴随更负面的情感）？

#### 8.1.3 媒体×时段交叉分析

**数据来源：** `articles` 表的 `media` × `period` 交叉分组

**分析方法：**
- 卡方检验：检验媒体和时段是否独立
- 事后比较：哪些媒体×时段组合显著偏离期望值？
- 效应量计算：Cramér's V

#### 8.1.4 信度统计

**数据来源：** `coding_tasks` 表的 `agreement_rate` 和 `kappa` 字段

**分析内容：**
- 整体 Kappa 均值和分布
- 按编码节点的 Kappa（哪些节点最难编码？）
- 按编码员对的 Kappa（哪些编码员组合信度最高？）
- Kappa 随时间的变化（编码培训效果）

### 8.2 定性分析路径

#### 8.2.1 叙事模式分析

**数据来源：** `articles.metadata.ai_narrative`

**分析步骤：**
1. 统计各叙事模式的频次（conflict-driven, hero-villain, victimhood 等）
2. 提取框架手法（framing devices）的文本证据
3. 按媒体分组比较叙事策略差异
4. 结合具体文章进行深度分析

**研究发现示例：**
- NYT 和 WP 偏好 "conflict-driven" 叙事
- Guardian 偏好 "human-interest" 叙事
- WSJ 偏好 "data-driven" 叙事

#### 8.2.2 信源策略分析

**数据来源：** `articles.metadata.ai_sources`

**分析维度：**
- **信源类型分布：** 官方 vs 专家 vs 公众 vs 匿名 vs 媒体 vs 企业
- **信源多样性：** 使用 Shannon 多样性指数
- **匿名信源使用率：** 哪些媒体更依赖匿名信源？
- **信源地理分布：** 中国信源 vs 西方信源 vs 第三方信源

**研究问题示例：**
- 西方媒体在报道中国式现代化时，是否过度依赖西方专家而非中国官方/学者？
- 匿名信源是否与更负面的情感相关？

#### 8.2.3 语言特征分析

**数据来源：** `articles.metadata.ai_linguistic`

**分析维度：**
- **被动语态使用：** "was described as" vs "described"（隐性立场表达）
- **比较修辞：** "unlike Western democracies"（他者化策略）
- **引用类型：** 直接引语 vs 间接引语 vs 转述

#### 8.2.4 术语话语分析

**数据来源：** `articles.metadata.ai_terms`

**分析方法：**
- 术语共现网络分析（哪些术语经常一起出现？）
- 术语演变追踪（不同时段的术语使用是否变化？）
- 跨媒体术语比较（不同媒体使用不同术语来描述同一现象？）

### 8.3 定量与定性的结合

**三角验证（Triangulation）策略：**

```
┌─────────────────────────────────────────────────────────┐
│                  三角验证分析框架                          │
│                                                         │
│         定量数据                    定性数据              │
│    ┌──────────────┐           ┌──────────────┐          │
│    │ 框架分布统计  │           │ 叙事模式分析  │          │
│    │ 情感趋势分析  │ ←──对比──→ │ 信源策略分析  │          │
│    │ Kappa 信度    │           │ 语言特征分析  │          │
│    └──────────────┘           └──────────────┘          │
│              │                       │                  │
│              └───────────┬───────────┘                  │
│                          ↓                              │
│                  ┌──────────────┐                        │
│                  │ 综合解释     │                        │
│                  │ 理论建构     │                        │
│                  └──────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

**示例：**
- 定量发现：NYT 的 "威胁" 框架占比 45%，显著高于 Guardian 的 20%
- 定性发现：NYT 的威胁框架多采用 "conflict-driven" 叙事，信源以西方专家为主
- 综合解释：NYT 通过选择特定信源和叙事策略来建构中国式现代化的"威胁"形象

---

## 九、研究工具箱

### 9.1 工具清单

平台内置 12 个研究辅助工具（`/settings` 页面）：

| 工具 | 功能 | 适用场景 |
|------|------|----------|
| **情感计算器** | LIWC 词典分析，支持外部 .dic 扩展 | 语料情感倾向量化 |
| **Kappa 计算器** | 粘贴两列编码，计算 Cohen's Kappa | 编码员信度快速验证 |
| **共现分析** | 词对共现（窗口=5），停用词过滤 | 话语搭配模式发现 |
| **词频统计** | 词数/句数/平均句长/独特词数 | 语料基本特征描述 |
| **文本清洗器** | HTML 标签/URL/邮箱移除 | 原始文本预处理 |
| **随机抽样** | 带种子的随机抽样（可复现） | 样本选取 |
| **时段分割器** | 按年/季/半年生成时段标签 | 研究时段划分 |
| **引文生成器** | GB/T 7714、APA、MLA 格式 | 论文写作 |
| **AI 提示词包** | 学术润色、翻译、摘要、方法论写作 | 论文写作辅助 |
| **文件命名器** | `{媒体}_{日期}_{编号}.txt` | 文件管理 |
| **数据导出** | CSV/JSON 格式导出 | 外部分析 |
| **ProQuest 检索** | 学术数据库检索辅助 | 文献检索 |

### 9.2 LIWC 情感词典引擎

**模块：** `src/lib/liwc-dict.ts`

**内置词典（5 类，500+ 词）：**

| 类别 | 词数 | 示例词 |
|------|------|--------|
| posemo（积极情感） | ~200 | achievement, benefit, confidence, excellent, growth |
| negemo（消极情感） | ~200 | crisis, conflict, threat, decline, failure |
| anx（焦虑） | ~50 | concern, fear, risk, uncertainty, worry |
| anger（愤怒） | ~70 | abuse, attack, hostile, outrage, punish |
| sad（悲伤） | ~50 | loss, suffer, tragedy, grief, despair |

**情感判定规则：** `posemo / (posemo + negemo)` 比率
- ≥70%：强烈正面 | ≥55%：偏正面 | ≥45%：偏中立 | ≥30%：偏负面 | <30%：强烈负面

**外部词典支持：** 可上传 LIWC-2007/2015/2022 格式的 `.dic` 文件扩展分析类别。

### 9.3 数据导出

**语料导出（`POST /api/tools/export`）：**
- JSON 格式：完整字段
- CSV 格式：id, title, media, period, status, publish_date, word_count, language, source_type, ai_summary, ai_sentiment, ai_framework_hint, url

**文献导出（`GET /api/literature/export`）：**
- Markdown 格式
- 仅导出标记为"综述用"的笔记

---

## 十、AI 技术融合总结

### 10.1 AI 在研究流程中的角色

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI 技术融合全景图                             │
│                                                                 │
│  采集阶段                                                        │
│  ├─ 智能查询生成：关键词组合 × 媒体域名的笛卡尔积                  │
│  └─ 多引擎降级：Bing → Serper → Google CSE                       │
│                                                                 │
│  处理阶段                                                        │
│  ├─ Readability 正文提取（Mozilla 开源）                          │
│  ├─ 付费墙检测（关键词 + 字数双条件）                              │
│  └─ 文本清洗（广告/导航/版权自动移除）                             │
│                                                                 │
│  分析阶段                                                        │
│  ├─ 9 维 AI 预读（MiMo v2.5 Pro）                                │
│  │   ├─ 摘要生成（EN/ZH）                                        │
│  │   ├─ 情感分析 + 框架分类                                      │
│  │   ├─ 叙事分析 + 语调分析                                      │
│  │   ├─ 信源分析 + 语言特征                                      │
│  │   └─ 术语提取                                                 │
│  └─ LIWC 词典分析（内置 500+ 词，支持外部扩展）                    │
│                                                                 │
│  编码阶段                                                        │
│  ├─ AI 预读面板：为编码员提供参考                                  │
│  ├─ 翻译助手：单词查询 + 段落翻译                                 │
│  └─ 文献识别：一键解析阅读笔记元数据                               │
│                                                                 │
│  写作阶段                                                        │
│  ├─ 引文生成：GB/T 7714、APA、MLA                                │
│  ├─ AI 提示词包：学术润色、翻译、摘要                              │
│  └─ 方法论自动生成（答辩页面）                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 10.2 AI 技术选型

| 技术 | 用途 | 选型理由 |
|------|------|----------|
| MiMo v2.5 Pro | 9 维预读分析 | 国内可用、中文能力强、性价比高 |
| DeepSeek Chat | 备用 AI + 翻译 | 国内可用、学术文本处理能力强 |
| Mozilla Readability | 正文提取 | 开源、成熟、对新闻网站适配好 |
| JSDOM | HTML 解析 | Node.js 生态、无需浏览器环境 |
| LIWC 词典 | 情感量化 | 学术界标准工具、可复现 |

### 10.3 AI 与传统方法的平衡

| 维度 | AI 的优势 | 人工的不可替代性 |
|------|----------|-----------------|
| 速度 | 毫秒级分析 | 需要分钟级深度阅读 |
| 一致性 | 相同输入相同输出 | 受疲劳/情绪影响 |
| 规模 | 可处理 800+ 篇 | 难以大规模覆盖 |
| 深度 | 模式识别 | 理论建构、文化理解 |
| 创造性 | 基于已有模式 | 可产生新理论框架 |

**核心理念：AI 是放大器，不是替代品。** AI 处理重复性工作（摘要、分类、统计），人类专注于创造性工作（理论建构、深度解释、质量控制）。

---

## 十一、技术架构与工程实践

### 11.1 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js（App Router） | 14.2.35 |
| 语言 | TypeScript | 5.x |
| UI 框架 | Tailwind CSS + shadcn/ui | 3.4 + 4.7 |
| 状态管理 | Zustand | 5.0 |
| 后端 | Supabase（PostgreSQL + Auth） | - |
| 图表 | Recharts | 3.8 |
| 内容提取 | JSDOM + @mozilla/readability | 25 + 0.5 |
| 文件解析 | mammoth (DOCX) + pdf-parse | 1.8 + 1.1 |

### 11.2 数据库设计

**核心表（11 个）：**

| 表 | 用途 |
|------|------|
| `articles` | 语料库（全文、元数据、AI 分析结果） |
| `coding_frameworks` | 编码框架 |
| `coding_nodes` | 编码节点（层级树） |
| `annotations` | 编码标注 |
| `coding_tasks` | 编码任务 |
| `profiles` | 用户档案 |
| `literature_notes` | 文献笔记 |
| `literature_comments` | 文献评论 |
| `crawl_jobs` | 采集任务 |
| `collection_logs` | 采集日志 |
| `ai_queue` | AI 任务队列 |

### 11.3 权限模型

**系统角色（5 级）：** admin > lead_researcher > researcher > coder > viewer

**研究角色（3 级，与系统角色解耦）：** team_lead、reviewer、coder

**RLS（行级安全）策略：** 每张表都有细粒度的 RLS 策略，确保数据隔离。

### 11.4 工程亮点

| 设计决策 | 解决的问题 |
|----------|-----------|
| 前端驱动批次架构 | 绕过 Vercel 8 秒超时限制 |
| SHA-256 URL 哈希去重 | O(1) 去重查重 |
| 双条件付费墙检测 | 避免短新闻误判 |
| metadata.cleaned_at 时间戳 | 批量清洗幂等性 |
| 系统角色与研究角色解耦 | 灵活权限管理 |
| 项目冻结机制 | 论文答辩数据一致性 |
| Repository 模式 | 可测试性、关注点分离 |
| 8 个 Zustand Store | 模块化状态管理 |

---

## 附录 A：关键文件索引

| 模块 | 文件路径 |
|------|----------|
| RSS 解析 | `src/lib/rss-parser.ts` |
| NewsAPI 客户端 | `src/lib/newsapi-client.ts` |
| GDELT 客户端 | `src/lib/gdelt-client.ts` |
| 搜索引擎客户端 | `src/lib/search-engine-client.ts` |
| 关键词扩展 | `src/lib/keyword-expander.ts` |
| 内容提取 | `src/lib/content-extractor.ts` |
| 文本清洗 | `src/lib/text-cleaner.ts` |
| 付费墙检测 | `src/lib/paywall-detector.ts` |
| AI 客户端 | `src/lib/ai/ai-client.ts` |
| 预读管线 | `src/lib/ai/pre-read-pipeline.ts` |
| LIWC 引擎 | `src/lib/liwc-dict.ts` |
| 信度计算 | `src/lib/stats/agreement.ts` |
| 入库守卫 | `src/lib/insert-guard.ts` |
| URL 去重 | `src/lib/dedup.ts` |
| 时间过滤 | `src/lib/time-filter.ts` |
| 批次计划 | `src/lib/batch-planner.ts` |
| 框架饼图 | `src/components/analytics/framework-pie.tsx` |
| 热力图 | `src/components/analytics/media-heatmap.tsx` |
| 时间线图 | `src/components/analytics/timeline-chart.tsx` |
| Kappa 图 | `src/components/analytics/kappa-chart.tsx` |
| AI 预读面板 | `src/components/coding/ai-panel.tsx` |
| 仲裁视图 | `src/components/coding/arbitration-view.tsx` |

## 附录 B：API 端点索引

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/crawl/start` | POST | 创建采集任务 |
| `/api/crawl/execute-batch` | POST | 执行单批次采集 |
| `/api/articles` | GET/POST | 语料 CRUD |
| `/api/articles/extract` | POST | 单篇全文提取 |
| `/api/articles/batch-clean` | GET | 批量文本清洗 |
| `/api/ai/pre-read` | POST | 触发 AI 预读 |
| `/api/analytics` | GET | 分析数据聚合 |
| `/api/tools/export` | POST | 数据导出 |
| `/api/literature/export` | GET | 文献导出 |
| `/api/terminal/chat` | POST | AI 终端对话 |
