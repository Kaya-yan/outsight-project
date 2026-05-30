import { NextResponse } from "next/server";
import { callMimoStream } from "@/lib/ai/mimo-client";

export async function POST(request: Request) {
  const { systemPrompt, userInput } = await request.json();
  if (!systemPrompt || !userInput) {
    return NextResponse.json({ error: "请提供 Prompt 和输入文本" }, { status: 400 });
  }

  const result = await callMimoStream(systemPrompt, userInput, {
    maxTokens: 512,
    timeoutMs: 30000,
  });

  if (!result.text) {
    return NextResponse.json({ error: `AI 请求失败: ${result.error ?? "无返回"}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, result: result.text });
}
