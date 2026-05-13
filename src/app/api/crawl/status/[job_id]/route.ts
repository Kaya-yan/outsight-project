import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCrawlJob } from "@/lib/data-access/crawl-jobs";
import type { Batch } from "@/lib/batch-planner";

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

  // Extract batch plan for detailed progress
  const batches = (job.query_params as Record<string, unknown>)?.batches as Batch[] | undefined;
  const currentBatch = batches
    ? batches.find((b) => b.status === "running") ?? batches.find((b) => b.status === "pending") ?? null
    : null;

  return NextResponse.json({
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    total_fetched: job.total_fetched,
    total_new: job.total_new,
    error_message: job.error_message,
    created_at: job.created_at,
    finished_at: job.finished_at,
    batch_index: job.batch_index ?? 0,
    batch_total: job.batch_total ?? 0,
    current_batch: currentBatch
      ? { type: currentBatch.type, label: currentBatch.label, status: currentBatch.status }
      : null,
  });
}
