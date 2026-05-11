import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listActiveFrameworks, createFramework } from "@/lib/data-access/coding-frameworks";
import { getProfileById } from "@/lib/data-access/profiles";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data, error } = await listActiveFrameworks(supabase);
  if (error) return NextResponse.json({ error: "查询失败" }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可管理框架" }, { status: 403 });
  }

  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: "框架名称为必填项" }, { status: 400 });
  }

  const { data, error } = await createFramework(supabase, {
    name: body.name,
    name_zh: body.name_zh,
    description: body.description,
    created_by: user.id,
  });

  if (error) return NextResponse.json({ error: "创建失败" }, { status: 500 });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
