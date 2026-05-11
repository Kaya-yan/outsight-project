import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateAnnotation, deleteAnnotation, getAnnotationById } from "@/lib/data-access/annotations";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: existing } = await getAnnotationById(supabase, params.id);
  if (!existing) return NextResponse.json({ error: "未找到该标注" }, { status: 404 });
  if (existing.coder_id !== user.id) {
    return NextResponse.json({ error: "只能编辑自己的标注" }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await updateAnnotation(supabase, params.id, body);
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

  const { data: existing } = await getAnnotationById(supabase, params.id);
  if (!existing) return NextResponse.json({ error: "未找到该标注" }, { status: 404 });
  if (existing.coder_id !== user.id) {
    return NextResponse.json({ error: "只能删除自己的标注" }, { status: 403 });
  }

  const { error } = await deleteAnnotation(supabase, params.id);
  if (error) return NextResponse.json({ error: "删除失败" }, { status: 500 });

  return NextResponse.json({ success: true });
}
