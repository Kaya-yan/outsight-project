"use client";

import { useState, useRef } from "react";
import { useDomesticStore } from "@/stores/domestic-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEDIA_ADAPTERS } from "@/lib/domestic/media-adapters";
import { Upload, FileText, ClipboardPaste, CheckCircle2, XCircle } from "lucide-react";

type UploadMode = "single" | "batch" | "file";

export function ManualUpload() {
  const { uploadArticle } = useDomesticStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<UploadMode>("single");
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Single article fields
  const [title, setTitle] = useState("");
  const [fullText, setFullText] = useState("");
  const [media, setMedia] = useState(MEDIA_ADAPTERS[0]?.name ?? "");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
  const [author, setAuthor] = useState("");
  const [url, setUrl] = useState("");

  // Batch paste
  const [batchText, setBatchText] = useState("");

  const resetForm = () => {
    setTitle("");
    setFullText("");
    setAuthor("");
    setUrl("");
    setResult(null);
  };

  const handleSingleUpload = async () => {
    if (!title.trim() || !fullText.trim()) return;
    setIsUploading(true);
    setResult(null);
    const res = await uploadArticle({
      title: title.trim(),
      fullText: fullText.trim(),
      media,
      publishDate,
      author: author.trim() || undefined,
      url: url.trim() || undefined,
    });
    setResult(res.ok ? { ok: true, msg: `上传成功 (${fullText.trim().replace(/\s/g, "").length}字)` } : { ok: false, msg: res.error || "上传失败" });
    if (res.ok) resetForm();
    setIsUploading(false);
  };

  const handleBatchUpload = async () => {
    const parts = batchText.split(/\n---\n/).map((s) => s.trim()).filter((s) => s.length > 30);
    if (parts.length === 0) {
      setResult({ ok: false, msg: "未检测到有效文章（请用 --- 分隔多篇文章）" });
      return;
    }
    setIsUploading(true);
    setResult(null);
    let success = 0;
    let fail = 0;
    for (const part of parts) {
      const lines = part.split("\n");
      const firstLine = lines[0]?.trim() || "未命名文章";
      const body = lines.slice(1).join("\n").trim() || part;
      const res = await uploadArticle({
        title: firstLine.slice(0, 100),
        fullText: body,
        media,
        publishDate,
      });
      if (res.ok) success++;
      else fail++;
    }
    setResult({ ok: fail === 0, msg: `批量完成: 成功 ${success}, 失败 ${fail}` });
    if (fail === 0) setBatchText("");
    setIsUploading(false);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setResult(null);
    try {
      const text = await file.text();
      if (text.length < 30) {
        setResult({ ok: false, msg: "文件内容过短" });
        setIsUploading(false);
        return;
      }
      const fileName = file.name.replace(/\.[^.]+$/, "");
      const res = await uploadArticle({
        title: fileName,
        fullText: text,
        media,
        publishDate,
      });
      setResult(res.ok ? { ok: true, msg: `上传成功: ${fileName} (${text.replace(/\s/g, "").length}字)` } : { ok: false, msg: res.error || "上传失败" });
    } catch {
      setResult({ ok: false, msg: "文件读取失败" });
    }
    setIsUploading(false);
  };

  const tabs: { key: UploadMode; label: string; icon: React.ReactNode }[] = [
    { key: "single", label: "单篇录入", icon: <FileText className="h-3 w-3" /> },
    { key: "batch", label: "批量粘贴", icon: <ClipboardPaste className="h-3 w-3" /> },
    { key: "file", label: "文件上传", icon: <Upload className="h-3 w-3" /> },
  ];

  return (
    <Card className="border-[#E2E5E9]">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <h3 className="text-sm font-medium text-[#2D3436]">手动补充</h3>

        {/* Mode Tabs */}
        <div className="flex gap-1 border-b border-[#E2E5E9]">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setMode(t.key); setResult(null); }}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs border-b-2 transition-colors ${
                mode === t.key
                  ? "border-[#4A90A4] text-[#4A90A4]"
                  : "border-transparent text-[#7F8A93] hover:text-[#2D3436]"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Common: Media & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#7F8A93] mb-1 block">来源媒体</label>
            <select
              value={media}
              onChange={(e) => setMedia(e.target.value)}
              className="h-8 w-full rounded border border-[#E2E5E9] bg-white px-2 text-xs text-[#2D3436]"
            >
              {MEDIA_ADAPTERS.map((a) => (
                <option key={a.id} value={a.name}>{a.name}</option>
              ))}
              <option value="其他">其他</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#7F8A93] mb-1 block">发布日期</label>
            <Input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="h-8 text-xs border-[#E2E5E9] bg-white" />
          </div>
        </div>

        {/* Single Article */}
        {mode === "single" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#7F8A93] mb-1 block">标题 *</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="文章标题" className="h-8 text-xs border-[#E2E5E9] bg-white" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#7F8A93] mb-1 block">作者</label>
                <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="可选" className="h-8 text-xs border-[#E2E5E9] bg-white" />
              </div>
              <div>
                <label className="text-xs text-[#7F8A93] mb-1 block">原文URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="可选" className="h-8 text-xs border-[#E2E5E9] bg-white" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#7F8A93] mb-1 block">正文 *</label>
              <textarea
                value={fullText}
                onChange={(e) => setFullText(e.target.value)}
                placeholder="粘贴或输入文章正文..."
                rows={8}
                className="w-full rounded border border-[#E2E5E9] bg-white px-3 py-2 text-xs text-[#2D3436] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
              />
              {fullText && <span className="text-[10px] text-[#95A5A6]">{fullText.replace(/\s/g, "").length} 字</span>}
            </div>
            <Button onClick={handleSingleUpload} disabled={isUploading || !title.trim() || !fullText.trim()} className="bg-[#4A90A4] hover:bg-[#3D7D8F] text-white h-8 text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              上传入库
            </Button>
          </div>
        )}

        {/* Batch Paste */}
        {mode === "batch" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#7F8A93] mb-1 block">批量粘贴（用 --- 分隔多篇文章）</label>
              <textarea
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder={"第一篇文章标题\n正文内容...\n\n---\n\n第二篇文章标题\n正文内容..."}
                rows={10}
                className="w-full rounded border border-[#E2E5E9] bg-white px-3 py-2 text-xs text-[#2D3436] resize-y font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
              />
            </div>
            <Button onClick={handleBatchUpload} disabled={isUploading || !batchText.trim()} className="bg-[#4A90A4] hover:bg-[#3D7D8F] text-white h-8 text-xs gap-1.5">
              <ClipboardPaste className="h-3.5 w-3.5" />
              批量入库
            </Button>
          </div>
        )}

        {/* File Upload */}
        {mode === "file" && (
          <div className="space-y-3">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E2E5E9] rounded-lg p-8 text-center cursor-pointer hover:border-[#4A90A4] transition-colors"
            >
              <Upload className="h-6 w-6 mx-auto text-[#95A5A6] mb-2" />
              <p className="text-xs text-[#7F8A93]">点击选择文件</p>
              <p className="text-[10px] text-[#95A5A6] mt-1">支持 TXT、HTML、MD、PDF、DOCX</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.html,.htm,.md,.pdf,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`flex items-center gap-2 text-xs p-2 rounded ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-[#f59e0b]/5 text-[#E67E22]"}`}>
            {result.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
            {result.msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
