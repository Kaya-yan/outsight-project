import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateLit } from "@/lib/data-access/literature";

/**
 * After client-side upload to Supabase Storage, this endpoint
 * records the file path/name in the literature_note row.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { path, name } = await request.json();
  if (!path || !name) return NextResponse.json({ error: "缺少 path 或 name" }, { status: 400 });

  const { error } = await updateLit(supabase, params.id, {
    attachment_path: path,
    attachment_name: name,
    updated_by: user.id,
  });

  if (error) return NextResponse.json({ error: "保存失败" }, { status: 500 });
  return NextResponse.json({ success: true });
}
