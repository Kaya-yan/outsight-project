"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确认",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onCancel}
      />
      <Card className="relative z-10 w-full max-w-sm border-[#E2E5E9] shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-semibold text-[#2D3436]">{title}</h3>
            <button
              type="button"
              onClick={onCancel}
              className="text-[#95A5A6] hover:text-[#2D3436]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-[#7F8A93] mb-6">{description}</p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="h-9 text-sm"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              className={`h-9 text-sm ${
                variant === "destructive"
                  ? "bg-[#E67E22] hover:bg-[#D46E1A] text-white"
                  : "bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
              }`}
            >
              {confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
