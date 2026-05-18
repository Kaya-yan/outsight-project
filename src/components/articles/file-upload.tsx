"use client";

import { useState, useRef, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X } from "lucide-react";

interface FileUploadProps {
  onUpload: (file: File, meta?: { title?: string; media?: string }) => void;
  isUploading: boolean;
}

export function FileUpload({ onUpload, isUploading }: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSet(file);
  }

  const ALLOWED_EXTS = ["txt", "html", "htm", "md", "pdf", "docx"];

  function validateAndSet(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTS.includes(ext)) {
      return;
    }
    setSelectedFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) validateAndSet(file);
  }

  function handleUpload() {
    if (selectedFile) {
      onUpload(selectedFile, {
        title: selectedFile.name.replace(/\.[^.]+$/, ""),
      });
    }
  }

  function handleClear() {
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? "border-[#4A90A4] bg-[#4A90A4]/5"
            : "border-[#E2E5E9] hover:border-[#4A90A4]/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.html,.htm,.md,.pdf,.docx"
          onChange={handleFileChange}
          className="hidden"
          id="file-upload-input"
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <FileText className="h-5 w-5 text-[#4A90A4]" />
            <span className="text-sm text-[#2D3436]">{selectedFile.name}</span>
            <span className="text-xs text-[#7F8A93]">
              ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-[#95A5A6] hover:text-[#E67E22]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor="file-upload-input"
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            <Upload className="h-8 w-8 text-[#7F8A93]" />
            <span className="text-sm text-[#7F8A93]">
              拖拽文件到此处，或点击选择
            </span>
            <span className="text-xs text-[#95A5A6]">
              支持 PDF / DOCX / TXT / MD / HTML 格式
            </span>
          </label>
        )}
      </div>

      {selectedFile && (
        <Button
          onClick={handleUpload}
          disabled={isUploading}
          className="w-full h-10 bg-[#4A90A4] hover:bg-[#3D7D8F] text-white"
        >
          {isUploading ? "上传中..." : "上传语料"}
        </Button>
      )}
    </div>
  );
}
