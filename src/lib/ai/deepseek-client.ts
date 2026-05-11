const DEEPSEEK_BASE = "https://api.deepseek.com/v1";
const MAX_RETRIES = 3;

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 512,
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return null;
      }

      const json = await res.json();
      return json.choices?.[0]?.message?.content?.trim() ?? null;
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  return null;
}

/**
 * Generate a 150-character summary of the article.
 */
export async function summarize(text: string): Promise<string | null> {
  const truncated = text.slice(0, 4000);
  return callDeepSeek(
    "You are a research assistant. Summarize the article in under 150 words in English. Focus on the main argument.",
    truncated,
    256,
  );
}

/**
 * Analyze sentiment: positive / negative / neutral with confidence.
 * Returns JSON string: { "sentiment": "positive|negative|neutral", "confidence": 0.0-1.0 }
 */
export async function analyzeSentiment(
  text: string,
): Promise<{ sentiment: string; confidence: number } | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `You are a sentiment analyst. Output ONLY valid JSON: {"sentiment":"positive"|"negative"|"neutral","confidence":0.0-1.0}`,
    truncated,
    128,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Suggest framework classification: threat / opportunity / problem / neutral
 * Returns JSON with framework, confidence, and evidence quotes.
 */
export async function suggestFramework(
  text: string,
): Promise<{ framework: string; confidence: number; evidence: string[] } | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `You analyze news discourse about China. Output ONLY valid JSON:
{
  "framework": "threat"|"opportunity"|"problem"|"neutral",
  "confidence": 0.0-1.0,
  "evidence": ["quote1", "quote2"]
}`,
    truncated,
    256,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Extract key terminology related to Chinese modernization discourse.
 */
export async function extractTerms(text: string): Promise<string[] | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `Extract key terms related to Chinese modernization, common prosperity, Belt and Road, foreign policy, and development discourse.
Output ONLY a JSON array of strings. Example: ["modernization", "common prosperity"]`,
    truncated,
    256,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Linguistic observations: passive voice, comparative rhetoric, citation types.
 */
export async function linguisticCheck(
  text: string,
): Promise<{ passive_voice: string[]; comparative_rhetoric: string[]; citation_types: string[] } | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `Analyze linguistic features of this news article. Output ONLY valid JSON:
{
  "passive_voice": ["example1", "example2"],
  "comparative_rhetoric": ["example1"],
  "citation_types": ["official source", "anonymous source"]
}`,
    truncated,
    256,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Generate a Chinese summary (~150 characters) of the article.
 */
export async function summarizeZh(text: string): Promise<string | null> {
  const truncated = text.slice(0, 4000);
  return callDeepSeek(
    "你是一名研究助理。请用中文撰写这篇新闻的简短摘要，约150字以内，重点概括核心论点与立场。",
    truncated,
    256,
  );
}

/**
 * Analyze narrative style of the news article.
 * Returns JSON with narrative type and explanation.
 */
export async function analyzeNarrative(
  text: string,
): Promise<{ style: string; explanation: string; framing_devices: string[] } | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `Analyze the narrative style of this news article. Consider these dimensions:
- Narrative mode: conflict-driven / hero-villain / victimhood / problem-solution / data-driven / human-interest / episodic / thematic
- Framing devices: metaphors, exemplars, catchphrases, depictions, visual imagery
- Story arc: setup-confrontation-resolution / inquiry-discovery / debate-perspectives

Output ONLY valid JSON:
{
  "style": "conflict-driven (one of the modes above)",
  "explanation": "Brief explanation in English, 2-3 sentences",
  "framing_devices": ["metaphor example", "catchphrase example"]
}`,
    truncated,
    256,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Analyze source attribution patterns in the article.
 * Returns JSON with source types and counts.
 */
export async function analyzeSources(
  text: string,
): Promise<{ source_types: Record<string, number>; named_sources: string[]; anonymous_count: number } | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `Analyze the sources cited in this news article. Categorize each source:
- official: government officials, institutional spokespersons
- expert: academics, analysts, think-tank researchers
- public: ordinary citizens, protesters, voters
- anonymous: unnamed sources, "sources say"
- media: citing other media outlets
- corporate: business leaders, company statements

Output ONLY valid JSON:
{
  "source_types": {"official": 3, "expert": 2, "anonymous": 1},
  "named_sources": ["President Xi", "Prof. Smith"],
  "anonymous_count": 1
}`,
    truncated,
    256,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

/**
 * Analyze the tone and rhetorical stance of the article.
 * Returns JSON with tone classification and key phrases.
 */
export async function analyzeTone(
  text: string,
): Promise<{ tone: string; confidence: number; keywords: string[] } | null> {
  const truncated = text.slice(0, 4000);
  const result = await callDeepSeek(
    `Analyze the tone of this news article. Classify as one of:
- critical: questioning, skeptical, challenging
- constructive: solution-oriented, forward-looking, pragmatic
- descriptive: neutral reporting, factual, balanced
- alarming: warning, fear-evoking, crisis language
- celebratory: praising, optimistic, progressive

Output ONLY valid JSON:
{
  "tone": "critical",
  "confidence": 0.85,
  "keywords": ["controversial", "concerns raised", "critics argue"]
}`,
    truncated,
    256,
  );
  if (!result) return null;
  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}
