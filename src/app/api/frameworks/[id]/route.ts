import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFrameworkById,
  updateFramework,
} from "@/lib/data-access/coding-frameworks";
import { listNodesByFramework } from "@/lib/data-access/coding-nodes";
import { getProfileById } from "@/lib/data-access/profiles";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: framework } = await getFrameworkById(supabase, params.id);
  if (!framework) return NextResponse.json({ error: "未找到该框架" }, { status: 404 });

  const { data: nodes } = await listNodesByFramework(supabase, params.id);

  return NextResponse.json({ data: { ...framework, nodes: nodes ?? [] } });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可管理框架" }, { status: 403 });
  }

  const body = await request.json();

  // Increment version on update
  const { data: current } = await getFrameworkById(supabase, params.id);
  if (!current) return NextResponse.json({ error: "未找到该框架" }, { status: 404 });

  const updates = { ...body };
  if (Object.keys(body).some((k) => k !== "version")) {
    updates.version = (current.version ?? 1) + 1;
  }

  const { data, error } = await updateFramework(supabase, params.id, updates);
  if (error) return NextResponse.json({ error: "更新失败" }, { status: 500 });

  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可删除框架" }, { status: 403 });
  }

  // Soft-delete: set is_active = false
  const { data, error } = await updateFramework(supabase, params.id, {
    is_active: false,
  } as Partial<{ is_active: boolean }>);
  if (error) return NextResponse.json({ error: "删除失败" }, { status: 500 });

  return NextResponse.json({ success: true });
}
