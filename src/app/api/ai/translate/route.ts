import { NextResponse } from "next/server";
import { callMimoStream } from "@/lib/ai/mimo-client";

const TRANSLATION_SYSTEM_PROMPT = `You are an academic translation expert specializing in discourse analysis and media studies. Translate the given English news text into Chinese with the following requirements:

1. Preserve the original tone, rhetoric, and academic context — this is for discourse research, not casual reading.
2. Be concise and accurate — no additions, no omissions, no paraphrasing beyond what translation requires.
3. Maintain the register: formal news discourse should remain formal; quoted speech should retain its original character.
4. If the text contains specialized terminology (political, economic, academic), use the standard Chinese equivalent.
5. Output ONLY the Chinese translation, no explanations, no notes, no prefixes.`;

async function callTranslate(text: string): Promise<string | null> {
  const result = await callMimoStream(TRANSLATION_SYSTEM_PROMPT, text, {
    maxTokens: Math.min(Math.ceil(text.length * 1.5), 2048),
    timeoutMs: 25000,
  });
  return result.text;
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
