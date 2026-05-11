import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/data-access/profiles";
import { bulkUpdateStatus } from "@/lib/data-access/articles";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可执行项目封存" }, { status: 403 });
  }

  // Get all non-archived, non-frozen articles
  const { data: articles, error: fetchError } = await supabase
    .from("articles")
    .select("id, status")
    .neq("status", "已封存")
    .eq("is_archived", false);

  if (fetchError) {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }

  if (!articles || articles.length === 0) {
    return NextResponse.json({ message: "所有语料已封存，无需操作", frozen: 0 });
  }

  const ids = articles.map((a) => a.id);
  const { error } = await bulkUpdateStatus(supabase, ids, "已封存");

  if (error) {
    return NextResponse.json({ error: "封存失败" }, { status: 500 });
  }

  // Log the activity
  await supabase.from("activity_logs").insert({
    user_id: user.id,
    action: "project_freeze",
    entity_type: "articles",
    details: {
      frozen_count: ids.length,
      frozen_by: profile.username,
      frozen_at: new Date().toISOString(),
    },
  });

  return NextResponse.json({
    success: true,
    frozen: ids.length,
    message: `项目已封存，${ids.length} 篇语料状态已锁定为「已封存」`,
    frozenAt: new Date().toISOString(),
  });
}
