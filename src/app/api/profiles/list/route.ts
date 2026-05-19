import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Try server client — if profiles RLS permits reads, this returns all active profiles.
  // Fall back gracefully: select only guaranteed columns; research_roles may not exist yet.
  let data: Record<string, unknown>[] | null = null;
  let error: unknown = null;

  try {
    const result = await supabase
      .from("profiles")
      .select("id, username, display_name, role, research_roles, avatar_url, institution, is_active")
      .order("username");
    data = result.data;
    error = result.error;
  } catch (e) {
    error = e;
  }

  // If the above failed (e.g. research_roles column missing), retry without it
  if (error) {
    try {
      const result = await supabase
        .from("profiles")
        .select("id, username, display_name, role, avatar_url, institution, is_active")
        .order("username");
      data = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }
  }

  if (error || !data) {
    const errObj = error as Record<string, unknown>;
    console.error("[profiles/list] All queries failed", JSON.stringify({
      code: errObj?.code,
      message: errObj?.message,
      details: errObj?.details,
      hint: errObj?.hint,
    }));
    const msg = errObj?.message
      ? `数据库错误: ${errObj.message}${errObj.details ? ' — ' + errObj.details : ''}`
      : "成员列表查询失败";
    return NextResponse.json(
      { error: msg, code: (errObj?.code as string) ?? "UNKNOWN" },
      { status: 500 },
    );
  }

  const members = (data)
    .filter((p) => p.is_active !== false)
    .map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      role: p.role,
      research_roles: (p as Record<string, unknown>).research_roles ?? [],
      avatar_url: p.avatar_url,
      institution: p.institution,
    }));

  return NextResponse.json({ data: members, total: members.length });
}
