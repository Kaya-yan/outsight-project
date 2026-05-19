import { NextResponse } from "next/server";
import { createClient as createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  // Use admin client to bypass RLS so all profiles are visible in member selector
  const admin = createAdminClient();
  const { data, error } = await admin.from("profiles").select("id, username, display_name, role, research_roles, avatar_url, institution").order("username");

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  // Return profile info for member selector — includes research_roles
  const members = (data ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    role: p.role,
    research_roles: p.research_roles ?? [],
    avatar_url: p.avatar_url,
    institution: p.institution,
  }));

  return NextResponse.json({ data: members });
}
