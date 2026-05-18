import { NextResponse } from "next/server";

const DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en";
const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

// ── types ──
interface DictPhonetic {
  text?: string;
  audio?: string;
}

interface DictDefinition {
  definition: string;
  example?: string;
}

interface DictMeaning {
  partOfSpeech: string;
  definitions: DictDefinition[];
}

interface DictEntry {
  word: string;
  phonetic?: string;
  phonetics: DictPhonetic[];
  meanings: DictMeaning[];
}

interface PhoneticsResult {
  uk?: string;
  us?: string;
}

// ── classify UK / US phonetics ──
function classifyPhonetics(phonetics: DictPhonetic[]): PhoneticsResult {
  const withText = phonetics.filter((p) => p.text);
  if (withText.length === 0) return {};

  let uk: string | undefined;
  let us: string | undefined;

  for (const p of withText) {
    const audio = (p.audio ?? "").toLowerCase();
    if (/[-_]us[-_.]|us\.mp3|american/.test(audio)) {
      us = p.text;
    } else if (/[-_]uk[-_.]|[-_]gb[-_.]|uk\.mp3|british/.test(audio)) {
      uk = p.text;
    }
  }

  if (!uk && !us) {
    if (withText.length === 1) {
      uk = withText[0].text;
    } else {
      uk = withText[0].text;
      us = withText[1].text;
    }
  } else if (uk && !us) {
    const other = withText.find((p) => p.text !== uk);
    if (other) us = other.text;
  } else if (!uk && us) {
    const other = withText.find((p) => p.text !== us);
    if (other) uk = other.text;
  }

  return { uk, us };
}

// ── DeepSeek: translate definitions & examples to Chinese ──
async function translateDefinitions(
  definitionsByPos: Record<string, string[]>,
  examples: string[],
  apiKey: string,
): Promise<{
  definitionsZh: Record<string, string[]>;
  examplesZh: string[];
} | null> {
  const payload = {
    definitions_by_pos: definitionsByPos,
    examples,
  };

  const prompt = `Translate these English dictionary definitions and example sentences into concise, accurate Chinese. Keep each translation short (under 15 Chinese characters per definition). Return ONLY a JSON object with the same structure. Do not add commentary.

Input:
${JSON.stringify(payload, null, 2)}

Output format:
{
  "definitions_by_pos": {
    "noun": ["中文释义1", "中文释义2"],
    "verb": ["中文释义"]
  },
  "examples_zh": ["例句中文翻译"]
}`;

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
          {
            role: "system",
            content:
              "You are a professional English-Chinese dictionary translator. Output only valid JSON, no explanation.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    return {
      definitionsZh: parsed.definitions_by_pos ?? {},
      examplesZh: parsed.examples_zh ?? [],
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const { word } = await request.json();
    if (!word || typeof word !== "string" || word.length > 50) {
      return NextResponse.json({ error: "Invalid word" }, { status: 400 });
    }

    // 1. Fetch from Free Dictionary API
    let entries: DictEntry[];
    try {
      const dictRes = await fetch(`${DICT_URL}/${encodeURIComponent(word)}`);
      if (!dictRes.ok) {
        return NextResponse.json(
          { error: "Word not found" },
          { status: 404 },
        );
      }
      entries = (await dictRes.json()) as DictEntry[];
    } catch {
      return NextResponse.json(
        { error: "Dictionary service unavailable" },
        { status: 502 },
      );
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Word not found" }, { status: 404 });
    }

    const entry = entries[0];

    // 2. Parse phonetics
    const phonetics = classifyPhonetics(entry.phonetics ?? []);

    // 3. Extract definitions grouped by POS, limit to 3 definitions per POS
    const definitionsByPos: Record<string, string[]> = {};
    const rawExamples: string[] = [];

    for (const meaning of entry.meanings ?? []) {
      const pos = meaning.partOfSpeech || "other";
      if (!definitionsByPos[pos]) definitionsByPos[pos] = [];
      for (const def of meaning.definitions ?? []) {
        if (definitionsByPos[pos].length < 3) {
          definitionsByPos[pos].push(def.definition);
        }
        if (def.example && rawExamples.length < 2) {
          rawExamples.push(def.example);
        }
      }
    }

    // 4. Translate definitions & examples to Chinese via DeepSeek
    const apiKey = process.env.DEEPSEEK_API_KEY;
    let definitionsZh: Record<string, string[]> = {};
    let examplesZh: string[] = [];

    if (apiKey) {
      const translated = await translateDefinitions(
        definitionsByPos,
        rawExamples,
        apiKey,
      );
      if (translated) {
        definitionsZh = translated.definitionsZh;
        examplesZh = translated.examplesZh;
      }
    }

    // Fallback: if translation failed, use English definitions
    const hasChinese = Object.keys(definitionsZh).length > 0;

    return NextResponse.json({
      word: entry.word,
      phonetics,
      meanings: (entry.meanings ?? []).map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitionsEn: m.definitions.slice(0, 3).map((d) => d.definition),
        definitionsZh: definitionsZh[m.partOfSpeech] ?? [],
      })),
      examples: rawExamples.map((en, i) => ({
        en,
        zh: examplesZh[i] ?? "",
      })),
      hasChinese,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
