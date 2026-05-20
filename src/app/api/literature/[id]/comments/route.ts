import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createComment, deleteComment } from "@/lib/data-access/literature";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { content, parent_id } = await request.json();
  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "评论内容为必填项" }, { status: 400 });
  }

  const { data, error } = await createComment(supabase, {
    note_id: params.id,
    author_id: user.id,
    content,
    parent_id: parent_id || null,
  });

  if (error) return NextResponse.json({ error: "评论失败" }, { status: 500 });
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const url = new URL(request.url);
  const commentId = url.searchParams.get("comment_id");
  if (!commentId) return NextResponse.json({ error: "缺少 comment_id" }, { status: 400 });

  const { error } = await deleteComment(supabase, commentId);
  if (error) return NextResponse.json({ error: "删除失败" }, { status: 500 });
  return NextResponse.json({ success: true });
}
