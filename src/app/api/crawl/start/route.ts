import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCrawlJob, updateCrawlJob } from "@/lib/data-access/crawl-jobs";
import { generateBatchPlan, getTotalBatchCount } from "@/lib/batch-planner";

/**
 * POST /api/crawl/start
 *
 * Creates a crawl job with a full batch execution plan and returns immediately.
 * The actual work is done by /api/crawl/execute-batch, driven by the frontend
 * in a sequential chain to avoid Vercel timeouts.
 */
export async function POST(request: Request) {
  console.log("STEP 1: crawl/start — request received");

  try {
    console.log("STEP 2: checking auth");
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      console.error("AUTH_FAILED:", authError ?? "no user");
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 },
      );
    }

    console.log("STEP 3: generating batch plan");
    const batches = generateBatchPlan();
    const batchTotal = batches.length;

    console.log("STEP 4: creating crawl job");
    const { data: job, error: insertError } = await createCrawlJob(supabase, {
      triggered_by: authData.user.id,
      query_params: {
        batches,
        batch_total: batchTotal,
        scope: "全部6媒体 × 7时段(2022-2025) × 3数据源 + 搜索",
      },
    });

    console.log("SUPABASE_INSERT_RESULT:", JSON.stringify({ job_id: job?.id, error: insertError }));

    if (insertError || !job) {
      console.error("CRAWL_START_ERROR:", insertError);
      return NextResponse.json(
        { success: false, error: `无法创建采集任务: ${String(insertError)}` },
        { status: 500 },
      );
    }

    // Also persist the batch_total at the row level for quick access
    await updateCrawlJob(supabase, job.id, { batch_total: batchTotal });

    console.log(`[Crawl] 任务已创建: ${job.id}, 共 ${batchTotal} 个批次`);

    return NextResponse.json({
      success: true,
      job_id: job.id,
      total_batches: batchTotal,
      message: `任务已创建，共 ${batchTotal} 个批次，将通过前端分批执行`,
    });
  } catch (error) {
    console.error("CRAWL_START_ERROR:", error);
    if (error instanceof Error) {
      console.error("STACK:", error.stack);
    }
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
