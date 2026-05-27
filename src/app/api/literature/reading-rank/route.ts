import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "week";

  // Calculate time range
  let startDate: string | null = null;
  const now = new Date();

  if (period === "week") {
    // Start of this week (Monday)
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    startDate = monday.toISOString();
  } else if (period === "month") {
    // Start of this month
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = firstDay.toISOString();
  }
  // "all" = no startDate filter

  // Query literature_notes with reader_name (the actual "who read this" field)
  let query = supabase
    .from("literature_notes")
    .select("reader_name, created_by, created_at")
    .not("reader_name", "is", null);

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data: notes, error } = await query;

  if (error) {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }

  // Count notes per reader_name
  const readerCounts: Record<string, number> = {};
  for (const n of notes ?? []) {
    const reader = n.reader_name?.trim();
    if (reader) {
      readerCounts[reader] = (readerCounts[reader] ?? 0) + 1;
    }
  }

  // Get all profiles to match reader_name to user info
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url");

  // Build lookup maps: display_name -> profile, username -> profile
  const profileByName = new Map<string, typeof profiles extends (infer U)[] | null ? U : never>();
  for (const p of profiles ?? []) {
    if (p.display_name) profileByName.set(p.display_name, p);
    if (p.username) profileByName.set(p.username, p);
  }

  // Build ranking array
  const rankings = Object.entries(readerCounts)
    .map(([readerName, count]) => {
      const p = profileByName.get(readerName);
      return {
        user_id: p?.id ?? readerName,
        username: p?.username ?? readerName,
        display_name: p?.display_name ?? readerName,
        avatar_url: p?.avatar_url ?? null,
        read_count: count,
      };
    })
    .sort((a, b) => b.read_count - a.read_count)
    .slice(0, 10);

  return NextResponse.json({ data: rankings });
}
