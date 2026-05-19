import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Use admin client to bypass RLS — all profiles visible
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, username, display_name, role, research_roles, avatar_url, institution, is_active")
    .order("username");

  if (error) {
    console.error("[profiles/list] Query failed:", JSON.stringify(error));
    return NextResponse.json({ error: `查询失败: ${(error as Record<string, unknown>).message ?? "未知"}` }, { status: 500 });
  }

  const members = (data ?? [])
    .filter((p) => p.is_active !== false)
    .map((p) => ({
      id: p.id,
      username: p.username,
      display_name: p.display_name,
      role: p.role,
      research_roles: p.research_roles ?? [],
      avatar_url: p.avatar_url,
      institution: p.institution,
    }));

  return NextResponse.json({ data: members, total: members.length });
}
