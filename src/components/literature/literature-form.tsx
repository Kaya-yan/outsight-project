"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MemberSelector } from "@/components/shared/member-selector";
import { Upload, FileText, Wand2 } from "lucide-react";

interface LitFormProps {
  initial?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => Promise<string | null>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function LiteratureForm({ initial, onSubmit, onCancel, isSubmitting }: LitFormProps) {
  // AI recognition
  const [rawText, setRawText] = useState("");
  const [recognizing, setRecognizing] = useState(false);
  const [recognizeError, setRecognizeError] = useState("");
  const [showRecognizer, setShowRecognizer] = useState(false);
  const [title, setTitle] = useState((initial?.title as string) ?? "");
  const [author, setAuthor] = useState((initial?.author as string) ?? "");
  const [publishDate, setPublishDate] = useState((initial?.publish_date as string) ?? "");
  const [journal, setJournal] = useState((initial?.journal as string) ?? "");
  const [url, setUrl] = useState((initial?.url as string) ?? "");
  const [readerId, setReaderId] = useState("");  // selected user id → API resolves to reader_name
  const [summary, setSummary] = useState((initial?.summary as string) ?? "");
  const [abstract, setAbstract] = useState((initial?.abstract as string) ?? "");
  const [researchMethod, setResearchMethod] = useState((initial?.research_method as string) ?? "");
  const [keyPoints, setKeyPoints] = useState(((initial?.key_points as string[]) ?? []).join("\n"));
  const [inspiration, setInspiration] = useState((initial?.inspiration as string) ?? "");
  const [notes, setNotes] = useState((initial?.notes as string) ?? "");
  const [forReview, setForReview] = useState((initial?.for_review as boolean) ?? false);
  const [rating, setRating] = useState((initial?.rating as number) ?? 0);
  const [tagsInput, setTagsInput] = useState(((initial?.tags as string[]) ?? []).join(", "));

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadAttachment(noteId: string): Promise<boolean> {
    if (!selectedFile) return true; // no file to upload = success
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      const res = await fetch(`/api/literature/${noteId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) return true;
      console.error("File upload failed:", await res.text());
    } catch (e) { console.error("File upload error:", e); }
    finally { setUploadingFile(false); }
    return false;
  }

  async function handleRecognize() {
    if (!rawText.trim() || rawText.trim().length < 20) {
      setRecognizeError("请粘贴至少20字的笔记内容");
      return;
    }
    setRecognizing(true);
    setRecognizeError("");
    try {
      const res = await fetch("/api/literature/recognize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.data) {
        const d = json.data;
        if (d.title) setTitle(d.title);
        if (d.author) setAuthor(d.author);
        if (d.publish_date) setPublishDate(d.publish_date);
        if (d.journal) setJournal(d.journal);
        if (d.url) setUrl(d.url);
        if (d.summary) setSummary(d.summary);
        if (d.abstract) setAbstract(d.abstract);
        if (d.research_method) setResearchMethod(d.research_method);
        if (d.key_points?.length) setKeyPoints(d.key_points.join("\n"));
        if (d.inspiration) setInspiration(d.inspiration);
        if (d.notes) setNotes(d.notes);
        if (d.rating) setRating(d.rating);
        if (d.tags?.length) setTagsInput(d.tags.join(", "));
        if (typeof d.for_review === "boolean") setForReview(d.for_review);
        setRecognizeError("");
      } else {
        setRecognizeError(json.error || "识别失败，请重试");
      }
    } catch {
      setRecognizeError("网络错误，请重试");
    }
    setRecognizing(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const resultNoteId = await onSubmit({
      title: title.trim(),
      author: author.trim() || null,
      publish_date: publishDate || null,
      journal: journal.trim() || null,
      url: url.trim() || null,
      summary: summary.trim() || null,
      abstract: abstract.trim() || null,
      research_method: researchMethod.trim() || null,
      reader_id: readerId || null,
      key_points: keyPoints.split("\n").map((k) => k.trim()).filter(Boolean),
      inspiration: inspiration.trim() || null,
      notes: notes.trim() || null,
      for_review: forReview,
      rating: rating || null,
      tags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
    });
    // If note was created and we have a file, upload it
    if (resultNoteId && selectedFile) {
      await uploadAttachment(resultNoteId);
    }
  }

  const fieldClass = "h-9 border-[#E2E5E9] text-sm focus-visible:ring-[#4A90A4]";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-h-[65vh] overflow-y-auto px-1">
      {/* ═══ AI Recognition ═══ */}
      {!initial?.id && (
        <div className="bg-[#4A90A4]/3 rounded-lg border border-[#4A90A4]/15 p-3 space-y-2">
          <button
            type="button"
            onClick={() => setShowRecognizer(!showRecognizer)}
            className="flex items-center gap-1.5 text-xs text-[#4A90A4] hover:underline"
          >
            <Wand2 className="h-3.5 w-3.5" />
            一键识别 {showRecognizer ? "▲" : "▼"}
          </button>
          {showRecognizer && (
            <>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="粘贴你的文献笔记原文...&#10;&#10;例如：这篇《Media Framing of Climate Change》是John Smith在2023年发表的，刊在Journal of Communication。主要讲的是媒体如何通过框架理论来研究气候变化报道。研究方法用的是内容分析和框架分析。我觉得对我们的项目很有启发，特别是编码框架设计部分。评分4星。标签：气候变化、框架理论、内容分析。适合放入文献综述。"
                rows={6}
                className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none font-sans"
              />
              {recognizeError && (
                <p className="text-xs text-[#E67E22]">{recognizeError}</p>
              )}
              <Button
                type="button"
                onClick={handleRecognize}
                disabled={recognizing || !rawText.trim()}
                className="h-8 text-xs gap-1 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {recognizing ? "识别中..." : "一键识别填充"}
              </Button>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <label className="text-xs text-[#7F8A93]">标题 *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} placeholder="文献标题" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">作者</label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} className={fieldClass} placeholder="作者姓名" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">发表时间</label>
          <Input value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className={fieldClass} placeholder="如 2024" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">来源期刊</label>
          <Input value={journal} onChange={(e) => setJournal(e.target.value)} className={fieldClass} placeholder="期刊名称" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">网页链接</label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} className={fieldClass} placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">阅读人</label>
          <MemberSelector
            value={readerId}
            onChange={setReaderId}
            placeholder="选择阅读人..."
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">研究方法</label>
          <Input value={researchMethod} onChange={(e) => setResearchMethod(e.target.value)} className={fieldClass} placeholder="如：深度访谈、问卷调查、内容分析..." />
        </div>
      </div>

      {/* File upload */}
      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">附件 (PDF / DOCX)</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
        {selectedFile ? (
          <div className="flex items-center gap-2 text-sm text-[#2D3436] bg-[#F0F2F5] rounded px-3 py-2">
            <FileText className="h-4 w-4 text-[#4A90A4]" />
            <span className="flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-[#7F8A93]">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="text-[#95A5A6] hover:text-[#E67E22] text-xs">移除</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full rounded-md border-2 border-dashed border-[#E2E5E9] hover:border-[#4A90A4]/50 px-3 py-2.5 text-xs text-[#7F8A93] hover:text-[#4A90A4] transition-colors"
          >
            <Upload className="h-4 w-4" />
            点击上传 PDF 或 DOCX 附件（可选）
          </button>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">一句话总结</label>
        <Input value={summary} onChange={(e) => setSummary(e.target.value)} className={fieldClass} placeholder="用一句话概括文献核心内容" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">摘要</label>
        <textarea value={abstract} onChange={(e) => setAbstract(e.target.value)} rows={2} className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">核心观点（每行一条）</label>
        <textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} rows={3} className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none font-mono text-xs" placeholder={"观点一\n观点二\n观点三"} />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">对项目启发</label>
        <textarea value={inspiration} onChange={(e) => setInspiration(e.target.value)} rows={2} className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-[#7F8A93]">备注</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">启发度 (1-5)</label>
          <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="flex h-9 w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]">
            <option value={0}>未评分</option>
            {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{"★".repeat(v)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">文献综述用</label>
          <select value={forReview ? "1" : "0"} onChange={(e) => setForReview(e.target.value === "1")} className="flex h-9 w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]">
            <option value="0">否</option>
            <option value="1">是</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-[#7F8A93]">标签</label>
          <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className={fieldClass} placeholder="逗号分隔" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting || uploadingFile} className="h-9 text-sm">取消</Button>
        <Button type="submit" disabled={isSubmitting || uploadingFile || !title.trim()} className="h-9 text-sm bg-[#4A90A4] hover:bg-[#3D7D8F] text-white">
          {uploadingFile ? "上传附件中..." : isSubmitting ? "保存中..." : initial?.id ? "更新文献" : "创建文献"}
        </Button>
      </div>
    </form>
  );
}
