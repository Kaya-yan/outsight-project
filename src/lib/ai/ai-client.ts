import { z } from "zod";
import { callLLMStream } from "@/lib/ai/mimo-client";

const sentimentSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.coerce.number().min(0).max(1),
});

const frameworkSchema = z.object({
  framework: z.enum(["threat", "opportunity", "problem", "neutral"]),
  confidence: z.coerce.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});

const termsSchema = z.array(z.string());

const linguisticSchema = z.object({
  passive_voice: z.array(z.string()).default([]),
  comparative_rhetoric: z.array(z.string()).default([]),
  citation_types: z.array(z.string()).default([]),
});

const narrativeSchema = z.object({
  style: z.string(),
  explanation: z.string(),
  framing_devices: z.array(z.string()).default([]),
});

const sourcesSchema = z.object({
  source_types: z.record(z.string(), z.coerce.number()).default({}),
  named_sources: z.array(z.string()).default([]),
  anonymous_count: z.coerce.number().default(0),
});

const toneSchema = z.object({
  tone: z.enum(["critical", "constructive", "descriptive", "alarming", "celebratory"]),
  confidence: z.coerce.number().min(0).max(1),
  keywords: z.array(z.string()).default([]),
});

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 512,
): Promise<string | null> {
  const result = await callLLMStream(systemPrompt, userPrompt, { maxTokens, timeoutMs: 60000 });
  return result.text;
}

async function callJson<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  maxTokens = 256,
): Promise<T | null> {
  const result = await callLLM(systemPrompt, userPrompt, maxTokens);
  if (!result) return null;

  try {
    const parsed = JSON.parse(result);
    const validated = schema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

export async function summarize(text: string): Promise<string | null> {
  const truncated = text.slice(0, 4000);
  return callLLM(
    "You are a research assistant. Summarize the article in under 150 words in English. Focus on the main argument.",
    truncated,
    256,
  );
}

export async function analyzeSentiment(
  text: string,
): Promise<{ sentiment: string; confidence: number } | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
    `You are a sentiment analyst. Output ONLY valid JSON: {"sentiment":"positive"|"negative"|"neutral","confidence":0.0-1.0}`,
    truncated,
    sentimentSchema,
    128,
  );
}

export async function suggestFramework(
  text: string,
): Promise<{ framework: string; confidence: number; evidence: string[] } | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
    `You analyze news discourse about China. Output ONLY valid JSON:
{
  "framework": "threat"|"opportunity"|"problem"|"neutral",
  "confidence": 0.0-1.0,
  "evidence": ["quote1", "quote2"]
}`,
    truncated,
    frameworkSchema,
    256,
  );
}

export async function extractTerms(text: string): Promise<string[] | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
    `Extract key terms related to Chinese modernization, common prosperity, Belt and Road, foreign policy, and development discourse.
Output ONLY a JSON array of strings. Example: ["modernization", "common prosperity"]`,
    truncated,
    termsSchema,
    256,
  );
}

export async function linguisticCheck(
  text: string,
): Promise<{ passive_voice: string[]; comparative_rhetoric: string[]; citation_types: string[] } | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
    `Analyze linguistic features of this news article. Output ONLY valid JSON:
{
  "passive_voice": ["example1", "example2"],
  "comparative_rhetoric": ["example1"],
  "citation_types": ["official source", "anonymous source"]
}`,
    truncated,
    linguisticSchema,
    256,
  );
}

export async function summarizeZh(text: string): Promise<string | null> {
  const truncated = text.slice(0, 4000);
  return callLLM(
    "你是一名研究助理。请用中文撰写这篇新闻的简短摘要，约150字以内，重点概括核心论点与立场。",
    truncated,
    256,
  );
}

export async function analyzeNarrative(
  text: string,
): Promise<{ style: string; explanation: string; framing_devices: string[] } | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
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
    narrativeSchema,
    256,
  );
}

export async function analyzeSources(
  text: string,
): Promise<{ source_types: Record<string, number>; named_sources: string[]; anonymous_count: number } | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
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
    sourcesSchema,
    256,
  );
}

export async function analyzeTone(
  text: string,
): Promise<{ tone: string; confidence: number; keywords: string[] } | null> {
  const truncated = text.slice(0, 4000);
  return callJson(
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
    toneSchema,
    256,
  );
}
