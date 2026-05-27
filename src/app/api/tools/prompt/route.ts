import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { systemPrompt, userInput } = await request.json();
  if (!systemPrompt || !userInput) {
    return NextResponse.json({ error: "请提供 Prompt 和输入文本" }, { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  const baseUrl = process.env.MIMO_BASE_URL ?? "https://token-plan-cn.xiaomimimo.com/anthropic";
  if (!apiKey) {
    return NextResponse.json({ error: "未配置 MIMO_API_KEY" }, { status: 500 });
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "mimo-v2.5-pro",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput },
          ],
          temperature: 0.3,
          max_tokens: 512,
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return NextResponse.json({ error: "AI 请求失败" }, { status: 500 });
      }

      const json = await res.json();
      const result = json.choices?.[0]?.message?.content?.trim() ?? "";

      return NextResponse.json({ success: true, result });
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  return NextResponse.json({ error: "AI 请求超时" }, { status: 500 });
}
