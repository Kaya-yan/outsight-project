import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { batchCreateAnnotations } from "@/lib/data-access/annotations";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { annotations } = await request.json();
  if (!Array.isArray(annotations) || annotations.length === 0) {
    return NextResponse.json({ error: "请提供标注数组" }, { status: 400 });
  }

  // Attach coder_id to each annotation
  const withCoder = annotations.map((a: Record<string, unknown>) => ({
    article_id: a.article_id,
    node_id: a.node_id,
    coder_id: user.id,
    quote_text: a.quote_text,
    start_offset: a.start_offset,
    end_offset: a.end_offset,
    note: a.note,
    confidence: a.confidence ?? 3,
  }));

  const { data, error } = await batchCreateAnnotations(supabase, withCoder);
  if (error) return NextResponse.json({ error: "批量创建失败" }, { status: 500 });

  return NextResponse.json({ success: true, data, count: data?.length ?? 0 }, { status: 201 });
}
