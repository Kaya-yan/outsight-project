import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestCollectionLog } from "@/lib/data-access/collection-logs";

const SYNC_INTERVAL_HOURS = 24;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: latestLog } = await getLatestCollectionLog(supabase);

  if (!latestLog) {
    return NextResponse.json({
      lastSync: null,
      suggested: true,
      message: "尚未执行过同步",
    });
  }

  const lastSync = latestLog.started_at;
  const hoursSinceSync =
    (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
  const suggested = hoursSinceSync > SYNC_INTERVAL_HOURS;

  return NextResponse.json({
    lastSync,
    hoursAgo: Math.round(hoursSinceSync * 10) / 10,
    suggested,
    lastResult: {
      fetched: latestLog.articles_fetched,
      new: latestLog.articles_new,
      status: latestLog.status,
    },
    message: suggested
      ? "距上次同步超过 24 小时，建议执行同步"
      : `上次同步于 ${Math.round(hoursSinceSync)} 小时前`,
  });
}
