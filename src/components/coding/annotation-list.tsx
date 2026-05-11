"use client";

import type { Annotation, CodingNode } from "@/types/database";
import { Pencil, Trash2 } from "lucide-react";

interface AnnotationListProps {
  annotations: Annotation[];
  nodes: CodingNode[];
  onEdit: (annotation: Annotation) => void;
  onDelete: (annotation: Annotation) => void;
}

export function AnnotationList({ annotations, nodes, onEdit, onDelete }: AnnotationListProps) {
  if (annotations.length === 0) {
    return (
      <p className="text-xs text-[#95A5A6] py-4 text-center">
        暂无标注，点击右侧框架树中的节点开始标注
      </p>
    );
  }

  function getNode(nodeId: string): CodingNode | undefined {
    return nodes.find((n) => n.id === nodeId);
  }

  return (
    <div className="space-y-2">
      {annotations.map((a) => {
        const node = getNode(a.node_id);
        const stars = Array.from({ length: 5 }, (_, i) =>
          i < (a.confidence ?? 0) ? "★" : "☆",
        );

        return (
          <div
            key={a.id}
            className="rounded-md border border-[#E2E5E9] p-2 text-xs hover:border-[#4A90A4]/30 transition-colors group"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className="block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: node?.color ?? "#4A90A4" }}
              />
              <span className="font-medium text-[#2D3436]">
                {node?.label ?? a.node_id.slice(0, 8)}
              </span>
              {node?.code && (
                <span className="text-[#95A5A6]">({node.code})</span>
              )}
              <span className="text-[#E67E22] ml-auto">{stars.join("")}</span>
            </div>

            {a.quote_text && (
              <p className="text-[#4A5568] italic pl-3.5 border-l-2 border-[#4A90A4]/20 mb-1">
                &ldquo;{a.quote_text.slice(0, 200)}{a.quote_text.length > 200 ? "..." : ""}&rdquo;
              </p>
            )}

            {a.note && (
              <p className="text-[#7F8A93] pl-3.5">{a.note}</p>
            )}

            <div className="hidden group-hover:flex items-center gap-1 mt-1 pl-3.5">
              <button
                type="button"
                onClick={() => onEdit(a)}
                className="p-0.5 rounded hover:bg-[#E2E5E9] text-[#7F8A93]"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(a)}
                className="p-0.5 rounded hover:bg-[#E2E5E9] text-[#E67E22]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
