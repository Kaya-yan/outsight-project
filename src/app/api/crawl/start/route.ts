import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCrawlJob } from "@/lib/data-access/crawl-jobs";

export async function POST(request: Request) {
  console.log("STEP 1: request received");

  try {
    console.log("STEP 2: checking auth");
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("AUTH_ERROR:", authError);
      return NextResponse.json(
        { success: false, error: `Auth error: ${authError.message}` },
        { status: 401 },
      );
    }

    if (!authData.user) {
      console.error("AUTH_FAILED: no user");
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 },
      );
    }

    console.log("STEP 3: creating crawl job");
    const { data: job, error: insertError } = await createCrawlJob(supabase, {
      triggered_by: authData.user.id,
      query_params: {
        media: ["BBC"],
        period: "2024H2",
        sources: ["rss", "newsapi", "gdelt"],
      },
    });

    console.log("SUPABASE_INSERT_RESULT:", JSON.stringify({ job, error: insertError }));

    if (insertError) {
      console.error("CRAWL_START_ERROR:", insertError);
      if (insertError instanceof Error) {
        console.error("STACK:", insertError.stack);
      }
      return NextResponse.json(
        { success: false, error: `Database insert failed: ${String(insertError)}` },
        { status: 500 },
      );
    }

    if (!job) {
      console.error("CRAWL_START_ERROR: createCrawlJob returned null/undefined job without error");
      return NextResponse.json(
        { success: false, error: "无法创建采集任务 — insert returned no data and no error" },
        { status: 500 },
      );
    }

    console.log("STEP 4: job created success", { job_id: job.id });
    console.log(`[Crawl] 任务已创建: ${job.id}`);

    return NextResponse.json({
      success: true,
      job_id: job.id,
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
