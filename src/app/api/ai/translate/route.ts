import { NextResponse } from "next/server";

const MIMO_BASE = process.env.MIMO_BASE_URL ?? "https://token-plan-cn.xiaomimimo.com/anthropic";

const TRANSLATION_SYSTEM_PROMPT = `You are an academic translation expert specializing in discourse analysis and media studies. Translate the given English news text into Chinese with the following requirements:

1. Preserve the original tone, rhetoric, and academic context — this is for discourse research, not casual reading.
2. Be concise and accurate — no additions, no omissions, no paraphrasing beyond what translation requires.
3. Maintain the register: formal news discourse should remain formal; quoted speech should retain its original character.
4. If the text contains specialized terminology (political, economic, academic), use the standard Chinese equivalent.
5. Output ONLY the Chinese translation, no explanations, no notes, no prefixes.`;

async function callTranslate(text: string): Promise<string | null> {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) return null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${MIMO_BASE}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "mimo-v2.5-pro",
          max_tokens: Math.min(Math.ceil(text.length * 1.5), 2048),
          system: TRANSLATION_SYSTEM_PROMPT,
          messages: [
            { role: "user", content: text },
          ],
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!res.ok) {
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        return null;
      }

      const json = await res.json();
      return json.content?.[0]?.text?.trim() ?? null;
    } catch {
      if (attempt < 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text || typeof text !== "string" || text.length > 8000) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const translated = await callTranslate(text);
    if (!translated) {
      return NextResponse.json({ error: "Translation failed" }, { status: 500 });
    }

    return NextResponse.json({ translatedText: translated });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
