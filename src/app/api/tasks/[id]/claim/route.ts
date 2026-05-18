import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimTask } from "@/lib/data-access/coding-tasks";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data, error } = await claimTask(supabase, params.id, user.id);

  if (error) {
    const msg = typeof error === "string" ? error : "认领失败";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}
