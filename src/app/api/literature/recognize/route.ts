import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MIMO_BASE = process.env.MIMO_BASE_URL ?? "https://token-plan-cn.xiaomimimo.com/anthropic";

const SYSTEM_PROMPT = `You are a research literature parser. Extract structured metadata from raw reading notes text.
Return ONLY valid JSON with these fields (use null for missing, empty array for no items):

{
  "title": "文献标题",
  "author": "作者（英文名或中文名）",
  "publish_date": "发表年份或日期",
  "journal": "来源期刊或出版社",
  "url": "网址链接（如果有）",
  "summary": "一句话核心总结",
  "abstract": "摘要（可多句）",
  "key_points": ["核心观点1", "核心观点2"],
  "research_method": "研究方法（如：深度访谈、问卷调查、内容分析、实验法、扎根理论、话语分析等）",
  "inspiration": "对项目的启发",
  "notes": "其他备注",
  "rating": 1-5的启发度评分（整数，根据文本中的评价推断，默认为null）,
  "tags": ["标签1", "标签2"],
  "for_review": true/false/null
}

Rules:
- Extract as much as possible from the provided text
- If the text mentions a score/rating, infer the rating value (1-5)
- If the text clearly indicates this is for literature review, set for_review to true
- Tags should be short keywords about the research topic/methodology
- Output ONLY the JSON object, nothing else.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { text } = await request.json();
  if (!text || typeof text !== "string" || text.length < 20) {
    return NextResponse.json({ error: "文本过短，请粘贴至少20字的笔记内容" }, { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI 服务未配置" }, { status: 500 });
  }

  try {
    const res = await fetch(`${MIMO_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mimo-v2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 4000) },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "AI 识别服务暂不可用" }, { status: 502 });
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: "AI 未返回有效结果" }, { status: 500 });
    }

    const parsed = JSON.parse(content);

    // Normalize: ensure array fields are arrays
    return NextResponse.json({
      success: true,
      data: {
        title: parsed.title || null,
        author: parsed.author || null,
        publish_date: parsed.publish_date || null,
        journal: parsed.journal || null,
        url: parsed.url || null,
        summary: parsed.summary || null,
        abstract: parsed.abstract || null,
        key_points: Array.isArray(parsed.key_points) ? parsed.key_points : [],
        research_method: parsed.research_method || null,
        inspiration: parsed.inspiration || null,
        notes: parsed.notes || null,
        rating: typeof parsed.rating === "number" && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : null,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        for_review: typeof parsed.for_review === "boolean" ? parsed.for_review : false,
      },
    });
  } catch (err) {
    console.error("[literature/recognize] Failed:", err);
    return NextResponse.json({ error: "识别失败，请重试" }, { status: 500 });
  }
}
