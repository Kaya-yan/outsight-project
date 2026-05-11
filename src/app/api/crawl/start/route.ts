import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCrawlJob } from "@/lib/data-access/crawl-jobs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: job } = await createCrawlJob(supabase, {
    triggered_by: user.id,
    query_params: {
      media: ["BBC"],
      period: "2024H2",
      sources: ["rss", "newsapi", "gdelt"],
    },
  });

  if (!job) {
    return NextResponse.json({ error: "无法创建采集任务" }, { status: 500 });
  }

  // Fire background execution — DON'T await
  // Self-request to /api/crawl/execute runs in its own request context
  // Derive base URL from the incoming request to avoid env var dependency
  const { origin } = new URL(request.url);
  fetch(`${origin}/api/crawl/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job_id: job.id }),
  }).catch(() => { /* fire-and-forget */ });

  console.log(`[Crawl] 任务已创建: ${job.id}`);

  return NextResponse.json({
    success: true,
    job_id: job.id,
  });
}
