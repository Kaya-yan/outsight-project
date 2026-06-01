"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MEDIA_OUTLETS, RESEARCH_PERIODS } from "@/lib/constants";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Article } from "@/types/database";

interface ArticleFormProps {
  article?: Partial<Article>;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function ArticleForm({ article, onSubmit, onCancel, isSubmitting }: ArticleFormProps) {
  const [title, setTitle] = useState(article?.title ?? "");
  const [titleZh, setTitleZh] = useState(article?.title_zh ?? "");
  const [url, setUrl] = useState(article?.url ?? "");
  const [media, setMedia] = useState(article?.media ?? "");
  const [publishDate, setPublishDate] = useState(article?.publish_date ?? "");
  const [period, setPeriod] = useState(article?.period ?? "");
  const [language, setLanguage] = useState(article?.language ?? "en");
  const [author, setAuthor] = useState(article?.author ?? "");
  const [abstract, setAbstract] = useState(article?.abstract ?? "");
  // Prefer full_text (cleaned plain text) over content (raw HTML)
  const [content, setContent] = useState(article?.full_text ?? article?.content ?? "");
  const [keywords, setKeywords] = useState((article?.keywords ?? []).join(", "));
  const [showRawHtml, setShowRawHtml] = useState(false);
  const hasRawHtml = !!(article?.content && article.content !== article.full_text);

  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "标题为必填项";
    if (!url.trim()) e.url = "URL为必填项";
    if (!media) e.media = "请选择媒体";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    await onSubmit({
      title: title.trim(),
      title_zh: titleZh.trim() || undefined,
      url: url.trim(),
      media,
      publish_date: publishDate || undefined,
      period: period || undefined,
      language,
      author: author.trim() || undefined,
      abstract: abstract.trim() || undefined,
      full_text: content.trim() || undefined,
      keywords: keywords
        ? keywords.split(",").map((k) => k.trim()).filter(Boolean)
        : undefined,
    });
  }

  const fieldClass = "h-10 border-[#E2E5E9] focus-visible:ring-[#4A90A4]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="af-title" className="text-sm">标题 *</Label>
          <Input
            id="af-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            placeholder="英文标题"
          />
          {errors.title && <p className="text-xs text-[#E67E22]">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-title-zh" className="text-sm">中文标题</Label>
          <Input
            id="af-title-zh"
            value={titleZh}
            onChange={(e) => setTitleZh(e.target.value)}
            className={fieldClass}
            placeholder="中文翻译"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="af-url" className="text-sm">URL *</Label>
          <Input
            id="af-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={fieldClass}
            placeholder="https://..."
          />
          {errors.url && <p className="text-xs text-[#E67E22]">{errors.url}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-author" className="text-sm">作者</Label>
          <Input
            id="af-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="af-media" className="text-sm">媒体 *</Label>
          <select
            id="af-media"
            value={media}
            onChange={(e) => setMedia(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
          >
            <option value="">选择媒体</option>
            {MEDIA_OUTLETS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          {errors.media && <p className="text-xs text-[#E67E22]">{errors.media}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-date" className="text-sm">发布日期</Label>
          <Input
            id="af-date"
            type="date"
            value={publishDate}
            onChange={(e) => setPublishDate(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-period" className="text-sm">研究时段</Label>
          <select
            id="af-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
          >
            <option value="">选择时段</option>
            {RESEARCH_PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="af-lang" className="text-sm">语言</Label>
          <select
            id="af-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="flex h-10 w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4]"
          >
            <option value="en">English</option>
            <option value="zh">中文</option>
            <option value="bilingual">双语</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="af-keywords" className="text-sm">关键词</Label>
          <Input
            id="af-keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            className={fieldClass}
            placeholder="逗号分隔"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="af-abstract" className="text-sm">摘要</Label>
        <textarea
          id="af-abstract"
          value={abstract}
          onChange={(e) => setAbstract(e.target.value)}
          rows={2}
          className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="af-content" className="text-sm">全文</Label>
        <textarea
          id="af-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="flex w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none font-mono"
          placeholder="粘贴或上传全文..."
        />
        {hasRawHtml && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setShowRawHtml(!showRawHtml)}
              className="flex items-center gap-1 text-[10px] text-[#95A5A6] hover:text-[#636E72] transition-colors"
            >
              {showRawHtml ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              查看原始 HTML
            </button>
            {showRawHtml && (
              <pre className="mt-1.5 max-h-40 overflow-auto rounded-md bg-[#F7F8FA] border border-[#E2E5E9] p-3 text-[10px] text-[#7F8A93] font-mono whitespace-pre-wrap break-all">
                {article?.content}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-10"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
        >
          {isSubmitting ? "保存中..." : article?.id ? "更新语料" : "创建语料"}
        </Button>
      </div>
    </form>
  );
}
