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

  // Query reading reactions grouped by user
  let query = supabase
    .from("literature_reactions")
    .select("user_id, note_id, created_at")
    .eq("reaction_type", "read");

  if (startDate) {
    query = query.gte("created_at", startDate);
  }

  const { data: reactions, error } = await query;

  if (error) {
    return NextResponse.json({ error: "查询失败" }, { status: 500 });
  }

  // Count distinct notes per user (deduplicate)
  const userNoteSets: Record<string, Set<string>> = {};
  for (const r of reactions ?? []) {
    if (!userNoteSets[r.user_id]) userNoteSets[r.user_id] = new Set();
    userNoteSets[r.user_id].add(r.note_id);
  }

  const userCounts: Record<string, number> = {};
  for (const [uid, noteSet] of Object.entries(userNoteSets)) {
    userCounts[uid] = noteSet.size;
  }

  // Get user profiles
  const userIds = Object.keys(userCounts);
  if (userIds.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  // Build ranking array
  const rankings = userIds
    .map((uid) => {
      const p = profileMap.get(uid);
      return {
        user_id: uid,
        username: p?.username ?? "unknown",
        display_name: p?.display_name ?? null,
        avatar_url: p?.avatar_url ?? null,
        read_count: userCounts[uid],
      };
    })
    .sort((a, b) => b.read_count - a.read_count)
    .slice(0, 10);

  return NextResponse.json({ data: rankings });
}
