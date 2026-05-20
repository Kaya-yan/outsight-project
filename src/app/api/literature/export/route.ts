import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listForReview } from "@/lib/data-access/literature";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const { data: notes } = await listForReview(supabase);
  if (!notes || notes.length === 0) {
    return NextResponse.json({ error: "暂无标记为文献综述的文献" }, { status: 404 });
  }

  // Build Markdown export
  const today = new Date().toISOString().split("T")[0];
  let md = `# Literature Review Export\nGenerated: ${today} | Total: ${notes.length} notes\n\n## Notes\n\n`;
  for (const n of notes) {
    md += `### ${n.title}\n`;
    if (n.author) md += `**Author**: ${n.author}\n\n`;
    if (n.journal) md += `**Journal**: ${n.journal}\n\n`;
    if (n.publish_date) md += `**Date**: ${n.publish_date}\n\n`;
    if (n.url) md += `**URL**: ${n.url}\n\n`;
    if (n.rating) md += `**Rating**: ${"★".repeat(n.rating)}${"☆".repeat(5 - n.rating)}\n\n`;
    if (n.tags && n.tags.length > 0) md += `**Tags**: ${n.tags.join(", ")}\n\n`;
    if (n.summary) md += `**Summary**: ${n.summary}\n\n`;
    if (n.abstract) md += `**Abstract**: ${n.abstract}\n\n`;
    if (n.key_points && n.key_points.length > 0) {
      md += `**Key Points**:\n${n.key_points.map((kp: string) => `- ${kp}`).join("\n")}\n\n`;
    }
    if (n.inspiration) md += `**Inspiration**: ${n.inspiration}\n\n`;
    if (n.notes) md += `**Notes**: ${n.notes}\n\n`;
    md += "---\n\n";
  }

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="literature_review_${today}.md"`,
    },
  });
}
