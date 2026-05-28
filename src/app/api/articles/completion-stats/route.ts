import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/articles/completion-stats
 *
 * Returns full-text completion statistics grouped by status and media.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Get all articles with relevant fields
  const { data: articles, error } = await supabase
    .from("articles")
    .select("id, media, full_text_status, url")
    .neq("status", "已封存");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({
      total: 0,
      byStatus: {},
      byMedia: {},
      fetchable: 0,
    });
  }

  // Group by status
  const byStatus: Record<string, number> = {};
  for (const a of articles) {
    const st = a.full_text_status ?? "missing";
    byStatus[st] = (byStatus[st] || 0) + 1;
  }

  // Group by media × status
  const byMedia: Record<string, Record<string, number>> = {};
  for (const a of articles) {
    const media = a.media ?? "unknown";
    const st = a.full_text_status ?? "missing";
    if (!byMedia[media]) byMedia[media] = {};
    byMedia[media][st] = (byMedia[media][st] || 0) + 1;
  }

  // Count fetchable articles (missing or partial, with URL)
  const fetchable = articles.filter(
    (a) =>
      (a.full_text_status === "missing" || a.full_text_status === "partial" || !a.full_text_status) &&
      a.url
  ).length;

  return NextResponse.json({
    total: articles.length,
    byStatus,
    byMedia,
    fetchable,
  });
}
