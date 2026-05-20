import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLitById, updateLit, deleteLit, listComments, listReactions } from "@/lib/data-access/literature";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: note, error } = await getLitById(supabase, params.id);
  if (error || !note) return NextResponse.json({ error: "未找到该文献" }, { status: 404 });

  // Load comments and user's reactions
  const [commentsRes, reactionsRes] = await Promise.all([
    listComments(supabase, params.id),
    listReactions(supabase, params.id, user.id),
  ]);

  return NextResponse.json({
    data: {
      note,
      comments: commentsRes.data ?? [],
      myReactions: (reactionsRes.data ?? []).map((r) => r.reaction_type),
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = await request.json();

  // Resolve reader_id → reader_name
  const updates: Record<string, unknown> = { ...body, updated_by: user.id };
  if (body.reader_id) {
    const { data: rp } = await supabase.from("profiles").select("display_name, username").eq("id", body.reader_id).single();
    updates.reader_name = rp?.display_name || rp?.username || null;
  }
  delete updates.reader_id;

  const { data, error } = await updateLit(supabase, params.id, updates);
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

  const { error } = await deleteLit(supabase, params.id);
  if (error) return NextResponse.json({ error: "删除失败" }, { status: 500 });
  return NextResponse.json({ success: true });
}
