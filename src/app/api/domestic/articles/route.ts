import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/domestic/articles
 * List domestic media articles with filters.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("articles")
    .select("*", { count: "exact" })
    .eq("source", "domestic_media")
    .order("publish_date", { ascending: false })
    .range(from, to);

  const media = searchParams.get("media");
  if (media) query = query.eq("media", media);

  const dateFrom = searchParams.get("dateFrom");
  if (dateFrom) query = query.gte("publish_date", dateFrom);

  const dateTo = searchParams.get("dateTo");
  if (dateTo) query = query.lte("publish_date", dateTo);

  const sourceType = searchParams.get("sourceType");
  if (sourceType) query = query.eq("source_type", sourceType);

  const search = searchParams.get("search");
  if (search) {
    const like = `%${search}%`;
    query = query.or(`title.ilike.${like},full_text.ilike.${like}`);
  }

  const hasAiAnalysis = searchParams.get("hasAiAnalysis");
  if (hasAiAnalysis === "true") {
    query = query.not("metadata->domestic_ai_analysis", "is", null);
  }

  const keyword = searchParams.get("keyword");
  if (keyword) {
    query = query.ilike("full_text", `%${keyword}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data ?? [], total: count ?? 0 });
}
