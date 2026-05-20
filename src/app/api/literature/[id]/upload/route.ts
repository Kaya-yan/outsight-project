import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateLit } from "@/lib/data-access/literature";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "请上传文件" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "docx", "doc"].includes(ext)) {
    return NextResponse.json({ error: "仅支持 PDF / DOCX 格式" }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const filePath = `${params.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("literature-attachments")
      .upload(filePath, buffer, {
        contentType: ext === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: `文件上传失败: ${uploadError.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("literature-attachments")
      .getPublicUrl(filePath);

    // Update literature note
    await updateLit(supabase, params.id, {
      attachment_path: urlData.publicUrl,
      attachment_name: file.name,
      updated_by: user.id,
    });

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      fileName: file.name,
    });
  } catch (err) {
    return NextResponse.json({ error: `上传处理失败: ${err instanceof Error ? err.message : "未知"}` }, { status: 500 });
  }
}
