"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { LiteratureCard } from "@/components/literature/literature-card";
import { LiteratureForm } from "@/components/literature/literature-form";
import { LiteratureDashboard } from "@/components/literature/literature-dashboard";
import { useLiteratureStore } from "@/stores/literature-store";
import { BookOpen, Plus, Search, Download, X } from "lucide-react";

export default function LiteraturePage() {
  const { notes, isLoading, stats, loadNotes, loadStats, createNote } = useLiteratureStore();
  const [search, setSearch] = useState("");
  const [filterReview, setFilterReview] = useState<boolean | undefined>();
  const [sortBy, setSortBy] = useState("created_at");
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadNotes({ search: search || undefined, forReview: filterReview, sort: sortBy });
    loadStats();
  }, [loadNotes, loadStats, search, filterReview, sortBy]);

  async function handleCreate(data: Record<string, unknown>) {
    setIsSubmitting(true);
    await createNote(data);
    setIsSubmitting(false);
    setShowForm(false);
  }

  async function handleExport() {
    window.open("/api/literature/export", "_blank");
  }

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#2D3436]">文献笔记 Hub</h1>
          <p className="mt-0.5 text-sm text-[#7F8A93]">团队文献沉淀与知识管理</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="h-8 text-xs gap-1">
            <Download className="h-3.5 w-3.5" />
            导出综述素材
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="h-8 text-xs gap-1 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white">
            <Plus className="h-3.5 w-3.5" />
            新建文献
          </Button>
        </div>
      </div>

      {/* Stats Dashboard */}
      {stats && <LiteratureDashboard stats={stats} />}

      {/* Create form */}
      {showForm && (
        <Card className="border-[#4A90A4]/30 bg-[#4A90A4]/3">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#2D3436]">新建文献笔记</h3>
              <button onClick={() => setShowForm(false)} className="text-[#95A5A6] hover:text-[#2D3436]"><X className="h-4 w-4" /></button>
            </div>
            <LiteratureForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} isSubmitting={isSubmitting} />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#95A5A6]" />
          <Input
            placeholder="搜索标题、作者、摘要..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs border-[#E2E5E9]"
          />
        </div>
        <select value={filterReview === undefined ? "" : filterReview ? "1" : "0"} onChange={(e) => setFilterReview(e.target.value === "" ? undefined : e.target.value === "1")} className="h-8 rounded border border-[#E2E5E9] bg-white px-2 text-xs">
          <option value="">全部文献</option>
          <option value="1">仅综述用</option>
          <option value="0">非综述</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-8 rounded border border-[#E2E5E9] bg-white px-2 text-xs">
          <option value="created_at">最新优先</option>
          <option value="rating">评分优先</option>
          <option value="read_count">最多阅读</option>
        </select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <p className="text-sm text-[#7F8A93] py-8 text-center">加载中...</p>
      ) : notes.length === 0 ? (
        <div className="py-12 text-center">
          <BookOpen className="h-10 w-10 text-[#95A5A6] mx-auto mb-3" />
          <p className="text-sm text-[#7F8A93]">暂无文献笔记</p>
          <p className="text-xs text-[#95A5A6] mt-1">点击"新建文献"开始沉淀阅读成果</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notes.map((n) => (
            <LiteratureCard
              key={n.id}
              id={n.id}
              title={n.title}
              author={n.author}
              journal={n.journal}
              publish_date={n.publish_date}
              summary={n.summary}
              rating={n.rating}
              tags={n.tags ?? []}
              for_review={n.for_review}
              read_count={n.read_count}
              like_count={n.like_count}
            />
          ))}
        </div>
      )}
    </div>
  );
}
