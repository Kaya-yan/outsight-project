"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CodingFramework, CodingNode } from "@/types/database";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, X } from "lucide-react";

export function FrameworkManager() {
  const [frameworks, setFrameworks] = useState<CodingFramework[]>([]);
  const [selectedFw, setSelectedFw] = useState<CodingFramework | null>(null);
  const [editingFw, setEditingFw] = useState<CodingFramework | null>(null);
  const [nodes, setNodes] = useState<CodingNode[]>([]);
  const [showCreateFw, setShowCreateFw] = useState(false);
  const [showCreateNode, setShowCreateNode] = useState(false);
  const [editingNode, setEditingNode] = useState<CodingNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for new framework
  const [fwName, setFwName] = useState("");
  const [fwNameZh, setFwNameZh] = useState("");
  const [fwDesc, setFwDesc] = useState("");

  // Form states for node
  const [nodeCode, setNodeCode] = useState("");
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeLabelZh, setNodeLabelZh] = useState("");
  const [nodeDesc, setNodeDesc] = useState("");
  const [nodeColor, setNodeColor] = useState("#4A90A4");
  const [nodeParentId, setNodeParentId] = useState<string | null>(null);

  const loadFrameworks = useCallback(async () => {
    try {
      const res = await fetch("/api/frameworks");
      if (res.ok) {
        const json = await res.json();
        setFrameworks(json.data ?? []);
      }
    } catch {
      // Silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNodes = useCallback(async (fwId: string) => {
    try {
      const res = await fetch(`/api/frameworks/${fwId}`);
      if (res.ok) {
        const json = await res.json();
        setNodes(json.data.nodes ?? []);
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  useEffect(() => {
    if (selectedFw) loadNodes(selectedFw.id);
  }, [selectedFw, loadNodes]);

  async function handleCreateFramework(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/frameworks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fwName, name_zh: fwNameZh, description: fwDesc }),
    });
    if (res.ok) {
      setShowCreateFw(false);
      resetFwForm();
      loadFrameworks();
    }
  }

  async function handleUpdateFramework(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFw) return;
    const res = await fetch(`/api/frameworks/${editingFw.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fwName, name_zh: fwNameZh, description: fwDesc }),
    });
    if (res.ok) {
      setEditingFw(null);
      resetFwForm();
      loadFrameworks();
    }
  }

  async function handleDeleteFramework(fw: CodingFramework) {
    if (!confirm(`确认删除框架「${fw.name}」？该框架下所有节点将被删除。此操作不可撤销。`)) return;
    const res = await fetch(`/api/frameworks/${fw.id}`, { method: "DELETE" });
    if (res.ok) {
      if (selectedFw?.id === fw.id) {
        setSelectedFw(null);
        setNodes([]);
      }
      loadFrameworks();
    }
  }

  function startEditFramework(fw: CodingFramework) {
    setEditingFw(fw);
    setFwName(fw.name);
    setFwNameZh(fw.name_zh ?? "");
    setFwDesc(fw.description ?? "");
  }

  function resetFwForm() {
    setFwName("");
    setFwNameZh("");
    setFwDesc("");
  }

  async function handleCreateNode(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFw) return;
    const res = await fetch(`/api/frameworks/${selectedFw.id}/nodes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: nodeCode,
        label: nodeLabel,
        label_zh: nodeLabelZh,
        description: nodeDesc,
        color: nodeColor,
        parent_id: nodeParentId,
      }),
    });
    if (res.ok) {
      setShowCreateNode(false);
      resetNodeForm();
      loadNodes(selectedFw.id);
    }
  }

  async function handleUpdateNode(e: React.FormEvent) {
    e.preventDefault();
    if (!editingNode) return;
    const res = await fetch(`/api/nodes/${editingNode.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: nodeCode,
        label: nodeLabel,
        label_zh: nodeLabelZh,
        description: nodeDesc,
        color: nodeColor,
      }),
    });
    if (res.ok) {
      setEditingNode(null);
      resetNodeForm();
      if (selectedFw) loadNodes(selectedFw.id);
    }
  }

  async function handleDeleteNode(node: CodingNode) {
    if (!confirm(`确认删除节点「${node.label}」？子节点将一并删除。`)) return;
    await fetch(`/api/nodes/${node.id}`, { method: "DELETE" });
    if (selectedFw) loadNodes(selectedFw.id);
  }

  function resetNodeForm() {
    setNodeCode("");
    setNodeLabel("");
    setNodeLabelZh("");
    setNodeDesc("");
    setNodeColor("#4A90A4");
    setNodeParentId(null);
  }

  function startEditNode(node: CodingNode) {
    setEditingNode(node);
    setNodeCode(node.code);
    setNodeLabel(node.label);
    setNodeLabelZh(node.label_zh ?? "");
    setNodeDesc(node.description ?? "");
    setNodeColor(node.color ?? "#4A90A4");
    setNodeParentId(node.parent_id);
  }

  function renderNodeItem(node: CodingNode, depth = 0) {
    const children = nodes.filter((n) => n.parent_id === node.id);
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#F0F2F5] text-xs group"
          style={{ paddingLeft: `${8 + depth * 20}px` }}
        >
          <span
            className="block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: node.color ?? "#4A90A4" }}
          />
          <span className="flex-1 text-[#2D3436]">{node.label}</span>
          <span className="text-[#95A5A6]">{node.code}</span>
          <div className="hidden group-hover:flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => startEditNode(node)}
              className="p-0.5 rounded hover:bg-[#E2E5E9] text-[#7F8A93]"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteNode(node)}
              className="p-0.5 rounded hover:bg-[#E2E5E9] text-[#E67E22]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        {children.map((c) => renderNodeItem(c, depth + 1))}
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-[#7F8A93] p-4">加载中...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#2D3436]">编码框架管理</h2>
        <Button
          onClick={() => setShowCreateFw(true)}
          className="h-8 text-xs gap-1 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          新建框架
        </Button>
      </div>

      {/* Framework list */}
      <div className="grid gap-2">
        {frameworks.map((fw) => (
          <Card
            key={fw.id}
            className={`border-[#E2E5E9] cursor-pointer transition-shadow ${
              selectedFw?.id === fw.id
                ? "ring-2 ring-[#4A90A4] shadow-md"
                : "shadow-card hover:shadow-md"
            }`}
            onClick={() => setSelectedFw(fw)}
          >
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0" onClick={() => setSelectedFw(fw)}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#2D3436]">{fw.name}</span>
                  {fw.name_zh && (
                    <span className="text-xs text-[#7F8A93]">{fw.name_zh}</span>
                  )}
                  <Badge className="text-[10px] bg-[#4A90A4]/10 text-[#4A90A4]">
                    v{fw.version}
                  </Badge>
                </div>
                {fw.description && (
                  <p className="text-xs text-[#7F8A93] mt-0.5">{fw.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); startEditFramework(fw); }}
                  className="p-1 rounded hover:bg-[#E2E5E9] text-[#7F8A93] hover:text-[#4A90A4]"
                  title="编辑框架"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteFramework(fw); }}
                  className="p-1 rounded hover:bg-[#E2E5E9] text-[#7F8A93] hover:text-[#E67E22]"
                  title="删除框架"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
        {frameworks.length === 0 && (
          <p className="text-center text-sm text-[#7F8A93] py-8">
            暂无编码框架，点击上方按钮创建
          </p>
        )}
      </div>

      {/* Node tree for selected framework */}
      {selectedFw && (
        <Card className="border-[#E2E5E9] shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#2D3436]">
                {selectedFw.name} · 节点树 ({nodes.length})
              </h3>
              <Button
                onClick={() => setShowCreateNode(true)}
                className="h-7 text-xs gap-1 bg-[#5DAD93] hover:bg-[#4E9A81] text-white"
              >
                <Plus className="h-3 w-3" />
                添加节点
              </Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {nodes
                .filter((n) => !n.parent_id)
                .map((root) => renderNodeItem(root))}
              {nodes.length === 0 && (
                <p className="text-xs text-[#7F8A93] py-4 text-center">
                  该框架暂无节点，点击添加第一个节点
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Framework Modal */}
      {(showCreateFw || editingFw) && (
        <Modal
          onClose={() => { setShowCreateFw(false); setEditingFw(null); resetFwForm(); }}
          title={editingFw ? "编辑编码框架" : "新建编码框架"}
        >
          <form onSubmit={editingFw ? handleUpdateFramework : handleCreateFramework} className="space-y-3">
            <Field label="框架名称 *" value={fwName} onChange={setFwName} />
            <Field label="中文名称" value={fwNameZh} onChange={setFwNameZh} />
            <Field label="描述" value={fwDesc} onChange={setFwDesc} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowCreateFw(false); setEditingFw(null); resetFwForm(); }} className="h-8 text-xs">取消</Button>
              <Button type="submit" className="h-8 text-xs bg-[#4A90A4] text-white">
                {editingFw ? "保存修改" : "创建框架"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Create/Edit Node Modal */}
      {(showCreateNode || editingNode) && (
        <Modal
          onClose={() => { setShowCreateNode(false); setEditingNode(null); resetNodeForm(); }}
          title={editingNode ? "编辑节点" : "添加节点"}
        >
          <form onSubmit={editingNode ? handleUpdateNode : handleCreateNode} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="代码 *" value={nodeCode} onChange={setNodeCode} placeholder="如 1.1" />
              <Field label="标签 *" value={nodeLabel} onChange={setNodeLabel} placeholder="如 Threat" />
            </div>
            <Field label="中文标签" value={nodeLabelZh} onChange={setNodeLabelZh} />
            <Field label="描述" value={nodeDesc} onChange={setNodeDesc} />
            <div className="space-y-1">
              <label className="text-xs text-[#7F8A93]">颜色</label>
              <input
                type="color"
                value={nodeColor}
                onChange={(e) => setNodeColor(e.target.value)}
                className="h-8 w-full rounded border border-[#E2E5E9] cursor-pointer"
              />
            </div>
            {selectedFw && !editingNode && (
              <div className="space-y-1">
                <label className="text-xs text-[#7F8A93]">父节点</label>
                <select
                  value={nodeParentId ?? ""}
                  onChange={(e) => setNodeParentId(e.target.value || null)}
                  className="flex h-9 w-full rounded-md border border-[#E2E5E9] bg-white px-3 py-1 text-sm"
                >
                  <option value="">(根节点)</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {"  ".repeat(n.level)} {n.label} ({n.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowCreateNode(false); setEditingNode(null); resetNodeForm(); }}
                className="h-8 text-xs"
              >
                取消
              </Button>
              <Button type="submit" className="h-8 text-xs bg-[#5DAD93] text-white">
                {editingNode ? "保存" : "创建"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// Helper sub-components
function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <Card className="relative z-10 w-full max-w-md border-[#E2E5E9] shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#2D3436]">{title}</h3>
            <button type="button" onClick={onClose} className="text-[#95A5A6] hover:text-[#2D3436]">
              <X className="h-4 w-4" />
            </button>
          </div>
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-[#7F8A93]">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 border-[#E2E5E9] text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}
