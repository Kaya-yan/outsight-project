"use client";

import { useState, useEffect } from "react";
import type { CodingFramework, CodingNode } from "@/types/database";
import { ChevronRight, ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FrameworkTreeProps {
  frameworkId: string;
  onSelectNode?: (node: CodingNode) => void;
  selectedNodeId?: string | null;
}

interface TreeNode extends CodingNode {
  children: TreeNode[];
}

function buildTree(nodes: CodingNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const n of nodes) {
    map.set(n.id, { ...n, children: [] });
  }
  for (const n of map.values()) {
    if (n.parent_id && map.has(n.parent_id)) {
      map.get(n.parent_id)!.children.push(n);
    } else {
      roots.push(n);
    }
  }
  return roots;
}

export function FrameworkTree({ frameworkId, onSelectNode, selectedNodeId }: FrameworkTreeProps) {
  const [nodes, setNodes] = useState<CodingNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/frameworks/${frameworkId}`);
        if (res.ok) {
          const json = await res.json();
          setNodes(json.data.nodes ?? []);
          // Auto-expand root nodes
          const roots = (json.data.nodes ?? []).filter((n: CodingNode) => !n.parent_id);
          setExpanded(new Set(roots.map((n: CodingNode) => n.id)));
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [frameworkId]);

  const tree = buildTree(nodes);
  const filtered = search
    ? nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(search.toLowerCase()) ||
          n.code.toLowerCase().includes(search.toLowerCase()) ||
          (n.label_zh ?? "").includes(search),
      )
    : [];

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (isLoading) {
    return <p className="text-xs text-[#7F8A93] p-2">加载框架...</p>;
  }

  function renderNode(node: TreeNode, depth = 0) {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const hasChildren = node.children.length > 0;
    const color = node.color ?? "#4A90A4";

    return (
      <div key={node.id}>
        <button
          type="button"
          onClick={() => {
            if (hasChildren) toggleExpand(node.id);
            onSelectNode?.(node);
          }}
          className={cn(
            "flex items-center gap-1 w-full text-left py-1 px-2 rounded text-xs transition-colors",
            isSelected
              ? "bg-[#4A90A4]/10 text-[#4A90A4] font-medium"
              : "hover:bg-[#F0F2F5] text-[#2D3436]",
          )}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 shrink-0 text-[#7F8A93]" />
            ) : (
              <ChevronRight className="h-3 w-3 shrink-0 text-[#7F8A93]" />
            )
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <span
            className="block w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="truncate">{node.label}</span>
          <span className="text-[10px] text-[#95A5A6] shrink-0">{node.code}</span>
        </button>
        {isExpanded &&
          node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#95A5A6]" />
        <Input
          placeholder="搜索节点..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 pl-7 pr-2 text-xs border-[#E2E5E9]"
        />
      </div>

      {/* Tree or Search Results */}
      <div className="max-h-[400px] overflow-y-auto">
        {search ? (
          filtered.length > 0 ? (
            filtered.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelectNode?.(n)}
                className={cn(
                  "flex items-center gap-1.5 w-full text-left py-1 px-2 rounded text-xs",
                  selectedNodeId === n.id
                    ? "bg-[#4A90A4]/10 text-[#4A90A4]"
                    : "hover:bg-[#F0F2F5] text-[#2D3436]",
                )}
              >
                <span
                  className="block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: n.color ?? "#4A90A4" }}
                />
                <span className="truncate">{n.label}</span>
                <span className="text-[10px] text-[#95A5A6] ml-auto">{n.code}</span>
              </button>
            ))
          ) : (
            <p className="text-xs text-[#95A5A6] p-2">无匹配节点</p>
          )
        ) : (
          tree.map((root) => renderNode(root))
        )}
      </div>
    </div>
  );
}
