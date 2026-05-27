import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle, updateArticle } from "@/lib/data-access/articles";
import { isWithinResearchPeriod, autoPeriod } from "@/lib/time-filter";
import { normalizeUrl, hashUrl } from "@/lib/dedup";
import { parseFile, getSupportedLabel } from "@/lib/parsers/adapter";
import { runPreReadPipeline } from "@/lib/ai/pre-read-pipeline";
import type { CreateArticleInput } from "@/lib/data-access/articles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const media = formData.get("media") as string | null;
    const period = formData.get("period") as string | null;
    const publishDate = formData.get("publish_date") as string | null;
    const url = formData.get("url") as string | null;

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    // Unified parser adapter — handles pdf, docx, txt, md, html
    let content: string;
    let wordCount: number;
    let parserWarnings: string[] = [];
    try {
      const parsed = await parseFile(file);
      content = parsed.plainText;
      wordCount = parsed.wordCount;
      parserWarnings = parsed.warnings;
      // Use parser-detected metadata as fallbacks
      if (!title && parsed.metadata.title) {
        // title will be used below
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "未知解析错误";
      return NextResponse.json({ error: `文件解析失败: ${msg}` }, { status: 400 });
    }

    if (!content || content.length < 10) {
      return NextResponse.json({ error: "文件内容为空或过短" }, { status: 400 });
    }

    // Time filter
    if (publishDate) {
      const periodCheck = isWithinResearchPeriod(publishDate);
      if (!periodCheck.valid) {
        return NextResponse.json(
          { error: `发布日期不在研究范围内 (2022-10-01 ~ 2024-12-31)` },
          { status: 400 },
        );
      }
    }

    // URL hash
    const normalized = normalizeUrl(url || `upload://${crypto.randomUUID()}`);
    const urlHash = hashUrl(normalized);

    const input: CreateArticleInput = {
      title: title ?? file.name.replace(/\.[^.]+$/, ""),
      url: url ?? "",
      media: media ?? undefined,
      period: period ?? autoPeriod(publishDate) ?? undefined,
      publish_date: publishDate ?? undefined,
      content,
      word_count: wordCount,
      status: "已入库",
      created_by: user.id,
      full_text_status: "manual_uploaded",
      url_hash: urlHash,
    };

    const { data: article, error } = await createArticle(supabase, input);

    if (error || !article) {
      return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }

    // ── Auto-processing pipeline (fire in background) ──
    // Step 1: Mark as cleaned immediately
    await updateArticle(supabase, article.id, { status: "已清洗" });

    // Step 2: Trigger AI pre-read asynchronously (don't block response)
    runPreReadPipeline(supabase, article.id, content).catch(() => {
      // Pipeline failure is non-blocking; article remains at 已清洗
    });

    return NextResponse.json({
      success: true,
      data: article,
      wordCount,
      parserWarnings: parserWarnings.length > 0 ? parserWarnings : undefined,
      message: `语料已入库，共 ${wordCount} 词。后台正在执行 AI 预读分析...`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "文件解析失败" }, { status: 400 });
  }
}

