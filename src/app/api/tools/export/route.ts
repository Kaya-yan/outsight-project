import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { type, media, period, status } = await request.json();

  // Build query
  let query = supabase.from("articles").select("*");
  if (media) query = query.eq("media", media);
  if (period) query = query.eq("period", period);
  if (status) query = query.eq("status", status);
  query = query.eq("is_archived", false);

  const { data: articles } = await query.order("publish_date", { ascending: false });

  if (!articles || articles.length === 0) {
    return NextResponse.json({ error: "没有符合条件的语料" }, { status: 400 });
  }

  if (type === "json") {
    return NextResponse.json({
      data: articles,
      count: articles.length,
      exportedAt: new Date().toISOString(),
    });
  }

  // CSV export — metadata
  const headers = [
    "id", "title", "media", "period", "status", "publish_date",
    "word_count", "language", "source_type", "ai_summary", "ai_sentiment",
    "ai_framework_hint", "url",
  ];

  const csvRows = [headers.join(",")];
  for (const a of articles) {
    const row = headers.map((h) => {
      const val = (a as Record<string, unknown>)[h];
      if (val === null || val === undefined) return "";
      const str = String(val);
      // Escape commas and quotes
      return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    });
    csvRows.push(row.join(","));
  }

  const csv = csvRows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="outsight_export_${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
