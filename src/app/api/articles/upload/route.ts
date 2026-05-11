import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createArticle } from "@/lib/data-access/articles";
import type { CreateArticleInput } from "@/lib/data-access/articles";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string | null;
    const media = formData.get("media") as string | null;
    const period = formData.get("period") as string | null;
    const publishDate = formData.get("publish_date") as string | null;
    const url = formData.get("url") as string | null;

    if (!file) {
      return NextResponse.json({ error: "请上传文件" }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext || !["txt", "html", "htm", "md"].includes(ext)) {
      return NextResponse.json({ error: "仅支持 .txt / .html / .md 格式" }, { status: 400 });
    }

    const rawText = await file.text();

    // Simple HTML tag stripping
    const content = ext === "html" || ext === "htm"
      ? rawText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
      : rawText.trim();

    if (!content) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    // Guess word count (English)
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    const input: CreateArticleInput = {
      title: title ?? fileName.replace(/\.[^.]+$/, ""),
      url: url ?? "",
      media: media ?? undefined,
      period: period ?? undefined,
      publish_date: publishDate ?? undefined,
      content,
      word_count: wordCount,
      status: "已入库",
      created_by: user.id,
    };

    const { data, error } = await createArticle(supabase, input);

    if (error) {
      return NextResponse.json({ error: "创建失败" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: `语料已入库，共 ${wordCount} 词`,
    }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "文件解析失败" }, { status: 400 });
  }
}
