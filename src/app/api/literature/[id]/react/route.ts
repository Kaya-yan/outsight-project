import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toggleReaction } from "@/lib/data-access/literature";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { type } = await request.json();
  if (!type || !["read", "like"].includes(type)) {
    return NextResponse.json({ error: "type 必须为 read 或 like" }, { status: 400 });
  }

  const { added } = await toggleReaction(supabase, params.id, user.id, type);
  return NextResponse.json({ success: true, added, type });
}
