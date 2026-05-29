/**
 * 8-dimension AI analysis for Chinese domestic media articles.
 * Each dimension has a specific theoretical grounding and operational definition.
 *
 * Uses the same callLLM interface as the existing ai-client.ts.
 */

// ── callLLM helper (same pattern as ai-client.ts) ──
const BASE_URL = process.env.MIMO_BASE_URL || "https://token-plan-cn.xiaomimimo.com/anthropic";
const API_KEY = process.env.MIMO_API_KEY || "";

async function callLLM(systemPrompt: string, userPrompt: string, maxTokens = 512): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          model: "mimo-v2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
    }
  }
  return null;
}

function parseJSON<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    // Extract JSON from possible markdown code blocks
    const cleaned = text.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────
// Dimension 1: 议题框架识别 (Entman Framing Theory)
// ──────────────────────────────────────────────────────────

interface FrameResult {
  primary_frame: string;
  frame_type: "development_achievement" | "risk_problem" | "moral_judgment" | "human_interest" | "mixed";
  confidence: number;
  framing_strategies: string[];
  key_evidence: string[];
}

const FRAME_SYSTEM = `你是一名话语分析研究员。基于Entman框架理论，分析以下中文新闻报道的议题框架。

框架类型定义：
- development_achievement（发展成就框架）：强调进步、成就、增长、突破
- risk_problem（风险问题框架）：强调挑战、风险、困难、不足
- moral_judgment（道德评判框架）：涉及正义、公平、责任、义务等道德判断
- human_interest（人情味框架）：以个人故事、情感、日常生活为切入点
- mixed（混合框架）：多种框架并存

规则：
1. 只基于文本实际内容判断，不要推测
2. 框架策略必须有原文证据支撑
3. 每条证据必须附带原文引语片段（20字以内）

输出JSON格式：
{
  "primary_frame": "框架名称",
  "frame_type": "development_achievement|risk_problem|moral_judgment|human_interest|mixed",
  "confidence": 0.0-1.0,
  "framing_strategies": ["策略1", "策略2"],
  "key_evidence": ["原文引语1", "原文引语2"]
}`;

export async function analyzeFrame(text: string): Promise<FrameResult | null> {
  const result = await callLLM(FRAME_SYSTEM, text.slice(0, 4000), 512);
  return parseJSON<FrameResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 2: 话语主体分析 (van Dijk News Discourse)
// ──────────────────────────────────────────────────────────

interface DiscourseActorResult {
  source_distribution: {
    party_government: number;
    expert: number;
    enterprise: number;
    public: number;
    foreign_media: number;
  };
  direct_quotes: number;
  indirect_quotes: number;
  leader_speech_count: number;
  leader_speech_examples: string[];
}

const DISCOURSE_ACTOR_SYSTEM = `你是一名新闻话语分析研究员。基于van Dijk新闻话语结构理论，分析以下报道的话语主体与消息源。

分析维度：
1. 消息源类型分布：统计五类消息源出现次数
   - party_government（党政机构）：国务院、部委、省委等
   - expert（专家学者）：学者、研究员、教授等
   - enterprise（企业）：企业家、公司代表等
   - public（民众）：普通市民、村民、网民等
   - foreign_media（外媒）：外国媒体、外国政要等
2. 直接引语 vs 间接引语数量
3. 领导人讲话引用次数及原文片段

规则：只统计文本中明确出现的消息源，不要推测。

输出JSON格式：
{
  "source_distribution": {"party_government": 0, "expert": 0, "enterprise": 0, "public": 0, "foreign_media": 0},
  "direct_quotes": 0,
  "indirect_quotes": 0,
  "leader_speech_count": 0,
  "leader_speech_examples": ["原文引语1", "原文引语2"]
}`;

export async function analyzeDiscourseActors(text: string): Promise<DiscourseActorResult | null> {
  const result = await callLLM(DISCOURSE_ACTOR_SYSTEM, text.slice(0, 4000), 512);
  return parseJSON<DiscourseActorResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 3: 政策工具识别 (Rothwell & Zegveld)
// ──────────────────────────────────────────────────────────

interface PolicyToolResult {
  tools: {
    type: "regulatory" | "incentive" | "capacity_building" | "symbolic";
    description: string;
    evidence: string;
  }[];
  dominant_type: string;
}

const POLICY_TOOL_SYSTEM = `你是一名公共政策分析研究员。基于Rothwell & Zegveld政策工具分类理论，识别以下报道中提到的政策工具。

政策工具类型：
- regulatory（命令型/管制型）：法规、禁令、标准、审批、配额
- incentive（激励型/供给型）：补贴、税收优惠、奖励、政府采购
- capacity_building（能力建设型/环境型）：基础设施、教育培训、技术研发、信息服务
- symbolic（象征型/需求型）：号召、倡导、示范、荣誉表彰

规则：
1. 只识别文本中明确提到的政策工具，不要推测
2. 每个工具必须附带原文证据（直接引语片段）
3. 如果文本未涉及具体政策工具，返回空数组

输出JSON格式：
{
  "tools": [{"type": "...", "description": "...", "evidence": "原文引语"}],
  "dominant_type": "最多出现的类型"
}`;

export async function analyzePolicyTools(text: string): Promise<PolicyToolResult | null> {
  const result = await callLLM(POLICY_TOOL_SYSTEM, text.slice(0, 4000), 512);
  return parseJSON<PolicyToolResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 4: 情感极性与强度 (Pang & Lee)
// ──────────────────────────────────────────────────────────

interface SentimentResult {
  polarity: "positive" | "neutral" | "negative";
  intensity: number; // 1-5
  target: string;
  keywords: string[];
}

const SENTIMENT_SYSTEM = `你是一名情感计算研究员。基于Pang & Lee情感计算方法，分析以下中文报道的情感极性。

分析维度：
1. polarity: 整体情感极性（positive/neutral/negative）
2. intensity: 情感强度（1=非常微弱, 2=微弱, 3=中等, 4=强烈, 5=非常强烈）
3. target: 情感对象定向（如：政策、政府、社会、经济、国际关系等）
4. keywords: 表征情感的关键词（最多5个）

规则：基于文本整体语调判断，不要被个别词汇误导。

输出JSON格式：
{
  "polarity": "positive|neutral|negative",
  "intensity": 1-5,
  "target": "情感对象",
  "keywords": ["关键词1", "关键词2"]
}`;

export async function analyzeSentimentZh(text: string): Promise<SentimentResult | null> {
  const result = await callLLM(SENTIMENT_SYSTEM, text.slice(0, 4000), 256);
  return parseJSON<SentimentResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 5: 互文性追踪 (Kristeva) — with anti-hallucination
// ──────────────────────────────────────────────────────────

interface IntertextualityResult {
  policy_documents: { name: string; evidence: string }[];
  leader_speeches: { speaker: string; evidence: string }[];
  historical_events: { event: string; evidence: string }[];
  foreign_media_refs: { source: string; evidence: string }[];
  classical_refs: { text: string; evidence: string }[];
}

const INTERTEXTUALITY_SYSTEM = `你是一名互文性分析研究员。基于Kristeva互文性理论，识别以下报道中的互文引用。

⚠️ 严格规则（违反任何一条将导致数据失真）：
1. 只列出文本中【明确出现】的引用，严禁推测、补充、推断
2. 如果文本中没有某类引用，该类别返回空数组 []
3. 每个引用必须附带原文中的【直接引语片段】作为证据（15字以内）
4. 引用名称必须是文本中实际出现的完整名称，不得缩写或改写
5. 如果你不确定某个引用是否真实存在于文本中，不要列出它

识别类别：
- policy_documents：明确提到的政策文件名称（如"《关于...的意见》"、"二十大报告"）
- leader_speeches：明确引用的领导人讲话（需标注发言人）
- historical_events：明确提到的历史事件（需附原文引语）
- foreign_media_refs：明确引用的外媒报道（需标注来源媒体）
- classical_refs：明确引用的古典文献、诗词、典故

输出JSON格式：
{
  "policy_documents": [{"name": "文件全称", "evidence": "原文引语"}],
  "leader_speeches": [{"speaker": "谁", "evidence": "原文引语"}],
  "historical_events": [{"event": "事件名", "evidence": "原文引语"}],
  "foreign_media_refs": [{"source": "媒体名", "evidence": "原文引语"}],
  "classical_refs": [{"text": "典故/诗词", "evidence": "原文引语"}]
}`;

export async function analyzeIntertextuality(text: string): Promise<IntertextualityResult | null> {
  const result = await callLLM(INTERTEXTUALITY_SYSTEM, text.slice(0, 4000), 512);
  return parseJSON<IntertextualityResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 6: 句法正式度 (Halliday Register Theory)
// ──────────────────────────────────────────────────────────

interface SyntaxFormalityResult {
  avg_sentence_length: number;
  passive_sentence_ratio: number;
  political_term_density: number;
  number_usage_frequency: number;
  formality_score: number; // 1-5
}

const SYNTAX_SYSTEM = `你是一名语域分析研究员。基于Halliday语域理论，分析以下中文报道的句法正式度。

分析指标：
1. avg_sentence_length：平均句长（按句号/问号/感叹号分句后的平均字数）
2. passive_sentence_ratio：被动句比例（"被""由""受到""得到"等标记的句子占比，0-1）
3. political_term_density：政治术语密度（每100字中出现的政治术语数）
4. number_usage_frequency：数字使用频率（每100字中出现的数字个数）
5. formality_score：整体正式度评分（1=口语化, 2=非正式, 3=中等, 4=正式, 5=高度正式）

规则：基于文本实际统计，不要估算。返回数值型结果。

输出JSON格式：
{
  "avg_sentence_length": 数字,
  "passive_sentence_ratio": 0.0-1.0,
  "political_term_density": 数字,
  "number_usage_frequency": 数字,
  "formality_score": 1-5
}`;

export async function analyzeSyntaxFormality(text: string): Promise<SyntaxFormalityResult | null> {
  const result = await callLLM(SYNTAX_SYSTEM, text.slice(0, 4000), 256);
  return parseJSON<SyntaxFormalityResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 7: 叙事视角 (Genette Narratology)
// ──────────────────────────────────────────────────────────

interface NarrativePerspectiveResult {
  macro_narrative_ratio: number; // 0-1, 宏观国家叙事占比
  micro_narrative_ratio: number; // 0-1, 微观个人叙事占比
  narrative_voice: "omniscient" | "reporter" | "quoted" | "mixed";
  narrative_examples: { type: "macro" | "micro"; evidence: string }[];
}

const NARRATIVE_SYSTEM = `你是一名叙事学分析研究员。基于Genette叙事学理论，分析以下报道的叙事视角。

分析维度：
1. 宏观国家叙事 vs 微观个人叙事比例
   - 宏观：国家政策、经济数据、国际关系、制度建设等
   - 微观：个人经历、群众故事、具体案例、生活场景等
2. 叙事声音类型：
   - omniscient（全知叙述）：上帝视角，叙述者无所不知
   - reporter（记者视角）：新闻报道体，客观陈述
   - quoted（引语叙述）：以当事人/专家引语推动叙事
   - mixed（混合视角）

规则：比例之和应为1.0。每个示例附带原文引语。

输出JSON格式：
{
  "macro_narrative_ratio": 0.0-1.0,
  "micro_narrative_ratio": 0.0-1.0,
  "narrative_voice": "omniscient|reporter|quoted|mixed",
  "narrative_examples": [{"type": "macro|micro", "evidence": "原文引语"}]
}`;

export async function analyzeNarrativePerspective(text: string): Promise<NarrativePerspectiveResult | null> {
  const result = await callLLM(NARRATIVE_SYSTEM, text.slice(0, 4000), 512);
  return parseJSON<NarrativePerspectiveResult>(result);
}

// ──────────────────────────────────────────────────────────
// Dimension 8: 地域层级指向 (Soja Third Space Theory)
// ──────────────────────────────────────────────────────────

interface SpatialReferenceResult {
  governance_level: { central: number; local: number };
  geographic_scope: { domestic: number; international: number };
  urban_rural: { urban: number; rural: number; neutral: number };
  key_locations: string[];
}

const SPATIAL_SYSTEM = `你是一名空间分析研究员。基于Soja第三空间理论，分析以下报道的地域层级指向。

分析维度（出现次数统计）：
1. governance_level：治理层级
   - central（中央层面）：国务院、中央、部委、总书记、全国性政策
   - local（地方层面）：省、市、县、基层、地方
2. geographic_scope：地理范围
   - domestic（国内）：涉及中国境内事务
   - international（国际）：涉及国际事务、外交、外国
3. urban_rural：城乡指向
   - urban（城市）：城市、都市、城区
   - rural（农村）：农村、乡村、田野、农业
   - neutral（不特指）
4. key_locations：文中出现的具体地名（最多5个）

规则：只统计文本中明确出现的地域指代。

输出JSON格式：
{
  "governance_level": {"central": 数字, "local": 数字},
  "geographic_scope": {"domestic": 数字, "international": 数字},
  "urban_rural": {"urban": 数字, "rural": 数字, "neutral": 数字},
  "key_locations": ["地名1", "地名2"]
}`;

export async function analyzeSpatialReference(text: string): Promise<SpatialReferenceResult | null> {
  const result = await callLLM(SPATIAL_SYSTEM, text.slice(0, 4000), 384);
  return parseJSON<SpatialReferenceResult>(result);
}

// ──────────────────────────────────────────────────────────
// Pipeline: Run all 8 dimensions in parallel
// ──────────────────────────────────────────────────────────

export interface DomesticAiAnalysis {
  frame: FrameResult | null;
  discourse_actors: DiscourseActorResult | null;
  policy_tools: PolicyToolResult | null;
  sentiment: SentimentResult | null;
  intertextuality: IntertextualityResult | null;
  syntax_formality: SyntaxFormalityResult | null;
  narrative: NarrativePerspectiveResult | null;
  spatial: SpatialReferenceResult | null;
  analyzed_at: string;
}

export async function runDomesticAiPipeline(text: string): Promise<DomesticAiAnalysis> {
  const [
    frame, discourse_actors, policy_tools, sentiment,
    intertextuality, syntax_formality, narrative, spatial,
  ] = await Promise.all([
    analyzeFrame(text),
    analyzeDiscourseActors(text),
    analyzePolicyTools(text),
    analyzeSentimentZh(text),
    analyzeIntertextuality(text),
    analyzeSyntaxFormality(text),
    analyzeNarrativePerspective(text),
    analyzeSpatialReference(text),
  ]);

  return {
    frame, discourse_actors, policy_tools, sentiment,
    intertextuality, syntax_formality, narrative, spatial,
    analyzed_at: new Date().toISOString(),
  };
}
