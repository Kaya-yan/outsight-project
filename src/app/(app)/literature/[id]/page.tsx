"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LiteratureForm } from "@/components/literature/literature-form";
import { LiteratureComments } from "@/components/literature/literature-comments";
import { useAuthStore } from "@/stores/auth-store";
import { ArrowLeft, Edit3, Trash2, ExternalLink, FileText, Eye, ThumbsUp, Upload, User } from "lucide-react";

interface NoteDetail {
  note: {
    id: string; title: string; author: string | null; publish_date: string | null;
    journal: string | null; url: string | null; summary: string | null;
    abstract: string | null; key_points: string[]; research_method: string | null;
    reader_name: string | null; inspiration: string | null;
    notes: string | null; for_review: boolean; rating: number | null;
    tags: string[]; attachment_path: string | null; attachment_name: string | null;
    read_count: number; like_count: number; created_by: string;
    created_at: string; updated_at: string;
  };
  comments: Array<{
    id: string; note_id: string; author_id: string; parent_id: string | null;
    content: string; created_at: string;
    profiles?: { username: string; display_name: string | null; avatar_url: string | null } | null;
  }>;
  myReactions: string[];
}

export default function LiteratureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const [detail, setDetail] = useState<NoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myReactions, setMyReactions] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/literature/${id}/upload`, { method: "POST", body: formData });
      if (res.ok) load();
    } catch { /* silent */ }
    setUploading(false);
  }

  async function load() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/literature/${id}`);
      if (res.ok) {
        const json = await res.json();
        setDetail(json.data);
        setMyReactions(json.data.myReactions ?? []);
      }
    } catch { /* silent */ }
    setIsLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  async function handleReact(type: "read" | "like") {
    try {
      const res = await fetch(`/api/literature/${id}/react`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.added) {
          setMyReactions((prev) => [...prev, type]);
        } else {
          setMyReactions((prev) => prev.filter((r) => r !== type));
        }
        load();
      }
    } catch { /* silent */ }
  }

  async function handleAddComment(content: string, parentId?: string) {
    try {
      await fetch(`/api/literature/${id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parent_id: parentId || null }),
      });
      load();
    } catch { /* silent */ }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await fetch(`/api/literature/${id}/comments?comment_id=${commentId}`, { method: "DELETE" });
      load();
    } catch { /* silent */ }
  }

  async function handleUpdate(data: Record<string, unknown>) {
    setIsSubmitting(true);
    try {
      await fetch(`/api/literature/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      setEditing(false);
      load();
    } catch { /* silent */ }
    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!confirm("确认删除这篇文献笔记？")) return;
    await fetch(`/api/literature/${id}`, { method: "DELETE" });
    router.push("/literature");
  }

  if (isLoading) return <p className="text-sm text-[#7F8A93] py-8 text-center">加载中...</p>;
  if (!detail) return <p className="text-sm text-[#E67E22] py-8 text-center">未找到该文献</p>;

  const { note, comments } = detail;
  const stars = note.rating ? "★".repeat(note.rating) + "☆".repeat(5 - note.rating) : null;
  const hasRead = myReactions.includes("read");
  const hasLiked = myReactions.includes("like");

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Back */}
      <Button onClick={() => router.push("/literature")} variant="ghost" className="h-8 text-xs gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> 返回列表
      </Button>

      {editing ? (
        <Card className="border-[#4A90A4]/30">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-[#2D3436] mb-3">编辑文献笔记</h3>
            <LiteratureForm initial={note as unknown as Record<string, unknown>} onSubmit={handleUpdate} onCancel={() => setEditing(false)} isSubmitting={isSubmitting} />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Title bar */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-[#2D3436] leading-snug">{note.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {note.author && <span className="text-sm text-[#7F8A93]">{note.author}</span>}
                {note.journal && <span className="text-sm text-[#4A90A4]">{note.journal}</span>}
                {note.publish_date && <span className="text-sm text-[#95A5A6]">{note.publish_date}</span>}
                {stars && <span className="text-[#E67E22]">{stars}</span>}
                {note.for_review && <span className="text-[10px] bg-[#E67E22]/10 text-[#E67E22] px-1.5 py-0.5 rounded">综述用</span>}
              </div>
            </div>
            <div className="flex gap-1.5 shrink-0">
              <Button onClick={() => setEditing(true)} variant="outline" className="h-8 text-xs gap-1"><Edit3 className="h-3 w-3" />编辑</Button>
              <Button onClick={handleDelete} variant="outline" className="h-8 text-xs text-[#E67E22] border-[#E67E22]/30 gap-1"><Trash2 className="h-3 w-3" />删除</Button>
            </div>
          </div>

          {/* Main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {/* Left: Attachment / URL */}
            <div className="lg:col-span-3 space-y-4">
              {/* Attachment card */}
              <Card className={`border-[#E2E5E9] ${!note.attachment_path ? "border-dashed" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-medium text-[#7F8A93] flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-[#4A90A4]" />附件
                    </h3>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="text-[10px] text-[#4A90A4] hover:underline flex items-center gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      {uploading ? "上传中..." : note.attachment_path ? "上传新附件" : "上传附件"}
                    </button>
                  </div>
                  {note.attachment_path ? (
                    note.attachment_name?.endsWith(".pdf") ? (
                      <iframe src={note.attachment_path} className="w-full h-[500px] rounded border" title="PDF preview" />
                    ) : (
                      <a href={note.attachment_path} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4A90A4] hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3.5 w-3.5" />下载 {note.attachment_name}
                      </a>
                    )
                  ) : (
                    <p className="text-xs text-[#95A5A6] text-center py-4">暂无附件</p>
                  )}
                </CardContent>
              </Card>
              {note.url ? (
                <Card className="border-[#E2E5E9]">
                  <CardContent className="p-4">
                    <h3 className="text-xs font-medium text-[#7F8A93] mb-2 flex items-center gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5 text-[#4A90A4]" />网页链接
                    </h3>
                    <a href={note.url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#4A90A4] hover:underline break-all">{note.url}</a>
                  </CardContent>
                </Card>
              ) : null}

              {/* Comments */}
              <Card className="border-[#E2E5E9]">
                <CardContent className="p-4">
                  <LiteratureComments
                    comments={comments}
                    currentUserId={user?.id ?? ""}
                    onAdd={handleAddComment}
                    onDelete={handleDeleteComment}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Metadata */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-[#E2E5E9]">
                <CardContent className="p-4 space-y-3">
                  {note.reader_name && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">阅读人</p>
                      <p className="text-sm text-[#4A90A4] flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {note.reader_name}
                      </p>
                    </div>
                  )}
                  {note.summary && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">一句话总结</p>
                      <p className="text-sm text-[#2D3436] leading-relaxed">{note.summary}</p>
                    </div>
                  )}
                  {note.research_method && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">研究方法</p>
                      <p className="text-sm text-[#5DAD93]">{note.research_method}</p>
                    </div>
                  )}
                  {note.abstract && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">摘要</p>
                      <p className="text-xs text-[#2D3436] leading-relaxed">{note.abstract}</p>
                    </div>
                  )}
                  {note.key_points && note.key_points.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">核心观点</p>
                      <ul className="list-disc list-inside text-xs text-[#2D3436] space-y-0.5">
                        {note.key_points.map((kp, i) => <li key={i}>{kp}</li>)}
                      </ul>
                    </div>
                  )}
                  {note.inspiration && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">对项目启发</p>
                      <p className="text-xs text-[#2D3436] leading-relaxed">{note.inspiration}</p>
                    </div>
                  )}
                  {note.notes && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">备注</p>
                      <p className="text-xs text-[#2D3436] leading-relaxed">{note.notes}</p>
                    </div>
                  )}
                  {note.tags && note.tags.length > 0 && (
                    <div>
                      <p className="text-[10px] text-[#7F8A93] uppercase tracking-wide mb-1">标签</p>
                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((t: string) => (
                          <span key={t} className="text-[10px] bg-[#F0F2F5] text-[#7F8A93] px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Reactions */}
              <Card className="border-[#E2E5E9]">
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => handleReact("read")} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors ${hasRead ? "bg-[#4A90A4]/10 text-[#4A90A4]" : "text-[#7F8A93] hover:bg-[#F0F2F5]"}`}>
                    <Eye className="h-4 w-4" /> 我也读过 ({note.read_count})
                  </button>
                  <button onClick={() => handleReact("like")} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors ${hasLiked ? "bg-[#E67E22]/10 text-[#E67E22]" : "text-[#7F8A93] hover:bg-[#F0F2F5]"}`}>
                    <ThumbsUp className="h-4 w-4" /> 有帮助 ({note.like_count})
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
