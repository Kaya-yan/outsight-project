import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listProfiles } from "@/lib/data-access/profiles";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data, error } = await listProfiles(supabase);

  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  // Return minimal profile info for member selector
  const members = (data ?? []).map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    role: p.role,
    avatar_url: p.avatar_url,
    institution: p.institution,
  }));

  return NextResponse.json({ data: members });
}
