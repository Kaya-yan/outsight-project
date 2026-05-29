import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/domestic/upload
 * Body: { title, fullText, media, publishDate?, author?, url? }
 *
 * Manually upload a single domestic media article.
 */

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  let body: {
    title: string;
    fullText: string;
    media: string;
    publishDate?: string;
    author?: string;
    url?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效 JSON" }, { status: 400 });
  }

  const { title, fullText, media, publishDate, author, url } = body;

  if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
  if (!fullText?.trim() || fullText.trim().length < 30) {
    return NextResponse.json({ error: "正文至少需要 30 个字符" }, { status: 400 });
  }
  if (!media?.trim()) return NextResponse.json({ error: "请选择来源媒体" }, { status: 400 });

  const cleanedText = fullText.trim();
  const charCount = cleanedText.replace(/\s/g, "").length;

  // Generate URL hash (use provided URL or a synthetic one)
  const effectiveUrl = url?.trim() || `manual://${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(effectiveUrl));
  const urlHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

  // Check for duplicate
  const { data: existing } = await supabase
    .from("articles")
    .select("id")
    .eq("url_hash", urlHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "该文章已存在（URL重复）" }, { status: 409 });
  }

  const insertData = {
    title: title.trim(),
    url: effectiveUrl,
    url_hash: urlHash,
    source: "domestic_media",
    media: media.trim(),
    source_type: "mainstream_media" as const,
    language: "zh" as const,
    publish_date: publishDate || new Date().toISOString().slice(0, 10),
    full_text: cleanedText,
    full_text_status: "complete" as const,
    word_count: charCount,
    status: "已入库" as const,
    author: author?.trim() || null,
    metadata: {
      char_count: charCount,
      collected_at: new Date().toISOString(),
      collection_source: "manual_upload",
    },
  };

  const { data: inserted, error: insertErr } = await supabase
    .from("articles")
    .insert(insertData)
    .select("id, title")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: `入库失败: ${insertErr.message}` }, { status: 500 });
  }

  return NextResponse.json({ data: inserted, charCount });
}
