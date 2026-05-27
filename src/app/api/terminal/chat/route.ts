import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { EASTER_EGGS } from "@/components/companion/companion-config";
import fs from "fs";
import path from "path";

const MIMO_API_KEY = process.env.MIMO_API_KEY;
const MIMO_BASE_URL = process.env.MIMO_BASE_URL ?? "https://token-plan-cn.xiaomimimo.com/anthropic";
const MIMO_MODEL = "mimo-v2.5-pro";

// ── Project plan summary cache ──
let cachedPlanSummary: string | null = null;

function extractPlanSummary(): string {
  if (cachedPlanSummary) return cachedPlanSummary;

  try {
    const planPath = path.join(process.cwd(), "docs", "project-plan.txt");
    const buffer = fs.readFileSync(planPath);

    // Detect encoding: try UTF-8 first, fallback to GBK
    let text: string;
    const utf8 = buffer.toString("utf8");
    if (utf8.includes("�")) {
      // GBK encoding detected — use TextDecoder with gbk
      const decoder = new TextDecoder("gbk");
      text = decoder.decode(buffer);
    } else {
      text = utf8;
    }

    // Extract key sections by chapter markers
    const sections: string[] = [];
    const chapterPatterns = [
      /一[、.．]\s*项目背景/,
      /二[、.．]\s*研究问题/,
      /三[、.．]\s*关键概念/,
      /四[、.．]\s*研究方法/,
      /五[、.．]\s*预期成果/,
      /六[、.．]\s*数据采集/,
      /七[、.．]\s*数据分析/,
      /八[、.．]\s*质量控制/,
      /九[、.．]\s*时间.*进度/,
      /十[、.．]\s*团队分工/,
      /十一[、.．]\s*预期成果/,
    ];

    const lines = text.split(/\r?\n/);
    let currentSection = "";
    let currentContent: string[] = [];
    let captureMode = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Check if this line starts a new chapter
      let isNewChapter = false;
      for (const pattern of chapterPatterns) {
        if (pattern.test(trimmed)) {
          // Save previous section
          if (captureMode && currentSection && currentContent.length > 0) {
            const content = currentContent.join("\n").trim();
            if (content.length > 20) {
              sections.push(`【${currentSection}】\n${content.slice(0, 300)}`);
            }
          }
          currentSection = trimmed.slice(0, 30); // Short label
          currentContent = [];
          captureMode = true;
          isNewChapter = true;
          break;
        }
      }

      if (!isNewChapter && captureMode) {
        if (trimmed.length > 0) {
          currentContent.push(trimmed);
        }
      }
    }

    // Save last section
    if (captureMode && currentSection && currentContent.length > 0) {
      const content = currentContent.join("\n").trim();
      if (content.length > 20) {
        sections.push(`【${currentSection}】\n${content.slice(0, 300)}`);
      }
    }

    // If no chapters found, use paragraph-based summary
    if (sections.length === 0) {
      const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 50);
      const topParagraphs = paragraphs.slice(0, 8).map((p) => p.trim().slice(0, 200));
      sections.push(...topParagraphs);
    }

    // Combine and truncate to ~800 chars
    let summary = sections.join("\n\n");
    if (summary.length > 800) {
      summary = summary.slice(0, 797) + "...";
    }

    cachedPlanSummary = summary;
    return summary;
  } catch (err) {
    console.error("[Terminal] Failed to read project-plan.txt:", err);
    return "（项目方案文件读取失败）";
  }
}

// ── Supabase context builder ──
async function buildProjectContext(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string> {
  const parts: string[] = [];

  // 1. Articles count
  const { count: articleCount } = await supabase
    .from("articles")
    .select("*", { count: "exact", head: true });
  parts.push(`语料库：共 ${articleCount ?? 0} 篇文章`);

  // 2. Full literature_notes (excluding attachment fields)
  const { data: litNotes } = await supabase
    .from("literature_notes")
    .select("id, title, author, publish_date, journal, url, summary, abstract, key_points, research_method, reader_name, inspiration, notes, for_review, rating, tags, read_count, like_count, created_by, created_at")
    .order("created_at", { ascending: false });

  if (litNotes && litNotes.length > 0) {
    const litSummary = litNotes.map((n, i) => {
      const parts = [`${i + 1}.《${n.title}》`];
      if (n.author) parts.push(`作者: ${n.author}`);
      if (n.journal) parts.push(`期刊: ${n.journal}`);
      if (n.publish_date) parts.push(`日期: ${n.publish_date}`);
      if (n.reader_name) parts.push(`阅读人: ${n.reader_name}`);
      if (n.summary) parts.push(`摘要: ${n.summary.slice(0, 100)}`);
      if (n.research_method) parts.push(`方法: ${n.research_method}`);
      if (n.rating) parts.push(`评分: ${n.rating}/5`);
      if (n.tags?.length) parts.push(`标签: ${n.tags.join(", ")}`);
      if (n.for_review) parts.push("【综述用】");
      parts.push(`阅读${n.read_count}次 · 点赞${n.like_count}次`);
      return parts.join(" | ");
    }).join("\n");

    parts.push(`\n文献笔记库：共 ${litNotes.length} 篇\n${litSummary}`);
  } else {
    parts.push("文献笔记库：暂无数据");
  }

  // 3. Profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, role, institution")
    .eq("is_active", true);

  if (profiles && profiles.length > 0) {
    const memberList = profiles.map((p) =>
      `${p.display_name || p.username}（${p.role}）`
    ).join("、");
    parts.push(`\n团队成员：${profiles.length} 人 — ${memberList}`);
  }

  return parts.join("\n");
}

// ── Main handler ──
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { message } = await request.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  const input = message.trim();

  // ── Step 1: Easter egg check (word boundary matching) ──
  for (const [keyword, response] of Object.entries(EASTER_EGGS)) {
    const pattern = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(input)) {
      return NextResponse.json({ response, type: "easter_egg" });
    }
  }

  // ── Step 2: Check if Mimo API is configured ──
  if (!MIMO_API_KEY) {
    return NextResponse.json({
      response: "AI 服务未配置。请在环境变量中设置 MIMO_API_KEY。",
      type: "error",
    });
  }

  // ── Step 3: Build context ──
  const [projectContext, planSummary] = await Promise.all([
    buildProjectContext(supabase),
    Promise.resolve(extractPlanSummary()),
  ]);

  // Get current user info
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("username, display_name, role")
    .eq("id", user.id)
    .single();

  const currentUserLabel = currentProfile
    ? `${currentProfile.display_name || currentProfile.username}（${currentProfile.role}）`
    : user.email;

  // ── Step 4: Build system prompt ──
  const systemPrompt = `你是 OutEye 2.0 的学术助手，代号 XiaoWai。你运行在话语研究协作平台中，熟悉团队的研究方向和平台功能。

## 项目概况
OutEye 2.0（OutSight）是一个英语主流媒体涉华报道的话语研究协作平台。研究核心是"中国式现代化"话语，分析 6 家主流媒体（NYT, WP, WSJ, Guardian, Economist, BBC）在 2022.10-2024.12 期间的报道。

## 项目方案摘要
${planSummary}

## 当前项目数据
${projectContext}

## 当前用户
${currentUserLabel}

## 回答要求
- 语气专业、亲切、简洁
- 涉及项目数据时引用具体数字
- 支持中英文混合对话
- 不确定的内容坦诚说明
- 如果用户问的是平台操作问题，给出具体步骤
- 如果用户问的是研究方法问题，结合项目实际给出建议`;

  // ── Step 5: Call Mimo API ──
  try {
    const res = await fetch(`${MIMO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MIMO_API_KEY}`,
      },
      body: JSON.stringify({
        model: MIMO_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
        temperature: 0.7,
        max_tokens: 1024,
        stream: true,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "unknown");
      console.error("[Terminal] Mimo API error:", res.status, errText);
      return NextResponse.json({
        response: `AI 服务暂时不可用（${res.status}），请稍后再试。`,
        type: "error",
      });
    }

    // Stream response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = res.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith("data: ")) continue;

              const data = trimmed.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip malformed chunks
              }
            }
          }
        } catch (err) {
          console.error("[Terminal] Stream error:", err);
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[Terminal] Fetch error:", err);
    return NextResponse.json({
      response: "网络连接失败，请检查 AI 服务配置。",
      type: "error",
    });
  }
}
