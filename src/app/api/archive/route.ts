import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileById } from "@/lib/data-access";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || !["admin", "lead_researcher"].includes(profile.role)) {
    return NextResponse.json({ error: "权限不足，仅管理员和组长可触发归档" }, { status: 403 });
  }

  const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // @ts-expect-error - Supabase RPC type inference for custom functions
  const result = await supabase.rpc("archive_old_articles", {
    cutoff: cutoffDate,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  const archivedCount = result.data as number;

  return NextResponse.json({
    success: true,
    archivedCount,
    message: `已归档 ${archivedCount} 篇超过 90 天的语料`,
  });
}
