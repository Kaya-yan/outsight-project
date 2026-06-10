import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listArticles, createArticle, updateArticle } from "@/lib/data-access/articles";
import { isWithinResearchPeriod, autoPeriod } from "@/lib/time-filter";
import { normalizeUrl, hashUrl } from "@/lib/dedup";
import { runPreReadPipeline } from "@/lib/ai/pre-read-pipeline";
import type { CreateArticleInput } from "@/lib/data-access/articles";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "20", 10);
  const media = searchParams.get("media") ?? undefined;
  const period = searchParams.get("period") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const fullTextStatusParam = searchParams.get("fullTextStatus") ?? undefined;
  const fullTextStatus = fullTextStatusParam ? fullTextStatusParam.split(",") : undefined;

  const { data, error, count } = await listArticles(supabase, {
    page,
    pageSize,
    media,
    period,
    status,
    fullTextStatus,
    search,
    isArchived: false,
  });

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  return NextResponse.json({ data, total: count ?? 0, page, pageSize });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body: CreateArticleInput = await request.json();

  if (!body.title || !body.url) {
    return NextResponse.json({ error: "标题和URL为必填项" }, { status: 400 });
  }

  // Time filter: reject articles outside research period
  const periodCheck = isWithinResearchPeriod(body.publish_date);
  if (!periodCheck.valid) {
    return NextResponse.json(
      { error: `发布日期不在研究范围内 (2022-10-01 ~ 2025-12-31): ${periodCheck.reason}` },
      { status: 400 },
    );
  }

  // Dedup check: reject duplicate URLs
  const normalized = normalizeUrl(body.url);
  const urlHash = hashUrl(normalized);
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("url_hash", urlHash)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "该URL已存在于数据库中" },
      { status: 409 },
    );
  }

  // Set defaults
  body.status = body.status ?? "已入库";
  body.created_by = user.id;
  body.media = body.media ?? body.source;
  body.source = body.source ?? body.media;
  body.period = body.period ?? autoPeriod(body.publish_date) ?? undefined;
  body.url_hash = urlHash;
  body.full_text_status = body.full_text_status ?? (body.content ? "manual_uploaded" : "missing");

  const { data: article, error } = await createArticle(supabase, body);

  if (error || !article) {
    const msg = error && typeof error === "object"
      ? ((error as Record<string, unknown>).message || (error as Record<string, unknown>).details || JSON.stringify(error))
      : String(error ?? "未知错误");
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // If content was provided, trigger AI pre-read pipeline (fire-and-forget)
  if (body.content && body.content.length > 50) {
    await updateArticle(supabase, article.id, { status: "已清洗" });
    runPreReadPipeline(supabase, article.id, body.content).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    data: article,
    message: body.content ? "语料已创建，后台正在执行 AI 预读分析..." : "语料已创建",
  }, { status: 201 });
}
