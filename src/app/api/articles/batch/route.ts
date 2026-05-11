import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getArticleById, bulkUpdateStatus } from "@/lib/data-access/articles";
import { ARTICLE_STATUS_TRANSITIONS, type ArticleStatus } from "@/types/database";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { articleIds, newStatus } = (await request.json()) as {
    articleIds: string[];
    newStatus: ArticleStatus;
  };

  if (!articleIds?.length || !newStatus) {
    return NextResponse.json({ error: "请提供语料ID列表和目标状态" }, { status: 400 });
  }

  // Validate each article's status transition
  const failed: { id: string; reason: string }[] = [];
  for (const id of articleIds) {
    const { data: article } = await getArticleById(supabase, id);
    if (!article) {
      failed.push({ id, reason: "未找到该语料" });
      continue;
    }
    const currentStatus = article.status as ArticleStatus;
    const allowed = ARTICLE_STATUS_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      failed.push({
        id,
        reason: `不能从"${currentStatus}"转为"${newStatus}"`,
      });
    }
  }

  if (failed.length > 0) {
    return NextResponse.json({ error: "部分语料无法变更状态", failed }, { status: 400 });
  }

  const { error } = await bulkUpdateStatus(supabase, articleIds, newStatus);
  if (error) return NextResponse.json({ error: "批量更新失败" }, { status: 500 });

  return NextResponse.json({ success: true, updated: articleIds.length });
}
