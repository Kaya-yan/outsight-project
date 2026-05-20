"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Reply, Trash2 } from "lucide-react";

interface Comment {
  id: string;
  note_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  profiles?: { username: string; display_name: string | null; avatar_url: string | null } | null;
}

interface CommentsProps {
  comments: Comment[];
  currentUserId: string;
  onAdd: (content: string, parentId?: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

export function LiteratureComments({ comments, currentUserId, onAdd, onDelete }: CommentsProps) {
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyingText, setReplyingText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topLevel = comments.filter((c) => !c.parent_id);
  const replies = (parentId: string) => comments.filter((c) => c.parent_id === parentId);

  async function handleSubmit(parentId?: string) {
    const content = parentId ? replyingText : text;
    if (!content.trim()) return;
    setIsSubmitting(true);
    await onAdd(content.trim(), parentId);
    if (parentId) { setReplyingText(""); setReplyTo(null); } else { setText(""); }
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-[#2D3436] flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-[#4A90A4]" />
        讨论 ({comments.length})
      </h3>

      {/* New top-level comment */}
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="添加评论..."
          rows={2}
          className="flex-1 rounded-md border border-[#E2E5E9] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none"
        />
        <Button onClick={() => handleSubmit()} disabled={isSubmitting || !text.trim()} className="h-9 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white shrink-0 self-end">
          发送
        </Button>
      </div>

      {/* Comments list */}
      {topLevel.length === 0 ? (
        <p className="text-xs text-[#95A5A6] py-2">暂无评论，来发表第一条</p>
      ) : (
        <div className="space-y-3">
          {topLevel.map((c) => {
            const profile = c.profiles;
            const name = profile?.display_name || profile?.username || "?";
            return (
              <div key={c.id} className="space-y-2">
                <div className="bg-[#FAFBFC] rounded-lg p-3 border border-[#F0F2F5]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-[#2D3436]">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#95A5A6]">{new Date(c.created_at).toLocaleDateString("zh-CN")}</span>
                      {c.author_id === currentUserId && (
                        <button onClick={() => onDelete(c.id)} className="text-[#95A5A6] hover:text-[#E67E22]">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#2D3436] leading-relaxed">{c.content}</p>
                  <button
                    onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}
                    className="text-[10px] text-[#4A90A4] hover:underline mt-1.5 flex items-center gap-1"
                  >
                    <Reply className="h-3 w-3" /> 回复
                  </button>
                </div>

                {/* Replies */}
                {replies(c.id).map((r) => {
                  const rp = r.profiles;
                  const rn = rp?.display_name || rp?.username || "?";
                  return (
                    <div key={r.id} className="ml-6 bg-[#F0F2F5] rounded-lg p-2.5 border border-[#E2E5E9]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-[#2D3436]">{rn}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-[#95A5A6]">{new Date(r.created_at).toLocaleDateString("zh-CN")}</span>
                          {r.author_id === currentUserId && (
                            <button onClick={() => onDelete(r.id)} className="text-[#95A5A6] hover:text-[#E67E22]">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#2D3436]">{r.content}</p>
                    </div>
                  );
                })}

                {/* Reply input */}
                {replyTo === c.id && (
                  <div className="ml-6 flex gap-2">
                    <textarea
                      value={replyingText}
                      onChange={(e) => setReplyingText(e.target.value)}
                      placeholder="回复..."
                      rows={1}
                      className="flex-1 rounded-md border border-[#E2E5E9] bg-white px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A90A4] resize-none"
                    />
                    <Button onClick={() => handleSubmit(c.id)} disabled={isSubmitting || !replyingText.trim()} className="h-7 text-xs bg-[#4A90A4] hover:bg-[#3D7D8F] text-white shrink-0">
                      回复
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
