import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCrawlJob } from "@/lib/data-access/crawl-jobs";

export async function GET(
  _request: Request,
  { params }: { params: { job_id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: job, error } = await getCrawlJob(supabase, params.job_id);

  if (error || !job) {
    return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  }

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    total_fetched: job.total_fetched,
    total_new: job.total_new,
    error_message: job.error_message,
    created_at: job.created_at,
    finished_at: job.finished_at,
  });
}
