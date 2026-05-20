import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLitStats } from "@/lib/data-access/literature";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const stats = await getLitStats(supabase);
  return NextResponse.json({ data: stats });
}
