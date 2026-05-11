import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNode } from "@/lib/data-access/coding-nodes";
import { getProfileById } from "@/lib/data-access/profiles";

export async function POST(
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
  if (!body.code || !body.label) {
    return NextResponse.json({ error: "节点代码和标签为必填项" }, { status: 400 });
  }

  // Calculate next sort_order for sibling nodes
  const parentId = body.parent_id ?? null;
  let sortOrder = body.sort_order ?? 0;
  if (!body.sort_order) {
    const { data: siblings } = await supabase
      .from("coding_nodes")
      .select("sort_order")
      .eq("framework_id", params.id)
      .eq("parent_id", parentId ?? "")
      .order("sort_order", { ascending: false })
      .limit(1);
    if (siblings && siblings.length > 0) {
      sortOrder = (siblings[0].sort_order ?? 0) + 1;
    }
  }

  const level = parentId ? 1 : 0; // Simplified — real implementation would compute from parent

  const { data, error } = await createNode(supabase, {
    framework_id: params.id,
    parent_id: parentId,
    code: body.code,
    label: body.label,
    label_zh: body.label_zh,
    description: body.description,
    level,
    sort_order: sortOrder,
  });

  if (error) return NextResponse.json({ error: "节点创建失败" }, { status: 500 });

  return NextResponse.json({ success: true, data }, { status: 201 });
}
