import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateNode, deleteNode, getNodeById } from "@/lib/data-access/coding-nodes";
import { getProfileById } from "@/lib/data-access/profiles";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: profile } = await getProfileById(supabase, user.id);
  if (!profile || (profile.role !== "admin" && profile.role !== "lead_researcher")) {
    return NextResponse.json({ error: "仅管理员和组长可管理节点" }, { status: 403 });
  }

  const body = await request.json();
  const { data, error } = await updateNode(supabase, params.id, body);
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
    return NextResponse.json({ error: "仅管理员可删除节点" }, { status: 403 });
  }

  // Delete child nodes first
  const { data: children } = await supabase
    .from("coding_nodes")
    .select("id")
    .eq("parent_id", params.id);
  if (children) {
    for (const child of children) {
      await deleteNode(supabase, child.id);
    }
  }

  const { error } = await deleteNode(supabase, params.id);
  if (error) return NextResponse.json({ error: "删除失败" }, { status: 500 });

  return NextResponse.json({ success: true });
}
