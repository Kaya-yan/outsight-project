"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import { TERMINAL_COMMANDS, type OrbState } from "./companion-config";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

interface TerminalPanelProps {
  orbState: OrbState;
  onClose?: () => void;
  onIMEChange?: (active: boolean) => void;
}

export const TerminalPanel = memo(function TerminalPanel({ orbState, onClose, onIMEChange }: TerminalPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: "Welcome to OutEye Terminal. Type /help for commands.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = useCallback((role: Message["role"], content: string) => {
    setMessages((prev) => [...prev, { role, content, timestamp: Date.now() }]);
  }, []);

  const handleCommand = useCallback((cmd: string) => {
    const lower = cmd.toLowerCase().trim();

    if (lower === "/clear") {
      setMessages([{
        role: "system",
        content: "Terminal cleared.",
        timestamp: Date.now(),
      }]);
      return true;
    }

    if (lower === "/help") {
      addMessage("system", TERMINAL_COMMANDS["/help"]);
      return true;
    }

    if (lower === "/stats") {
      addMessage("system", "Use the dashboard for live stats. Type any question to chat with AI.");
      return true;
    }

    if (lower === "/members") {
      addMessage("system", "Type a question about team members and I'll look it up for you.");
      return true;
    }

    return false;
  }, [addMessage]);

  const streamResponse = useCallback(async (userMessage: string) => {
    setIsStreaming(true);
    addMessage("user", userMessage);

    const assistantIdx = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: Date.now() }]);

    try {
      const res = await fetch("/api/terminal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIdx] = {
            role: "assistant",
            content: err.response || err.error || "请求失败",
            timestamp: Date.now(),
          };
          return next;
        });
        return;
      }

      const contentType = res.headers.get("content-type") ?? "";

      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const next = [...prev];
                  next[assistantIdx] = {
                    role: "assistant",
                    content: fullContent,
                    timestamp: Date.now(),
                  };
                  return next;
                });
              }
            } catch {
              // Skip
            }
          }
        }
      } else {
        const json = await res.json();
        setMessages((prev) => {
          const next = [...prev];
          next[assistantIdx] = {
            role: "assistant",
            content: json.response || "无响应",
            timestamp: Date.now(),
          };
          return next;
        });
      }
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        next[assistantIdx] = {
          role: "assistant",
          content: "网络连接失败",
          timestamp: Date.now(),
        };
        return next;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [messages.length, addMessage]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    setHistory((prev) => [trimmed, ...prev].slice(0, 50));
    setHistoryIdx(-1);
    setInput("");

    if (handleCommand(trimmed)) return;

    streamResponse(trimmed);
  }, [input, isStreaming, handleCommand, streamResponse]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const newIdx = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(newIdx);
      setInput(history[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx <= 0) {
        setHistoryIdx(-1);
        setInput("");
        return;
      }
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      setInput(history[newIdx]);
    }
  }, [history, historyIdx]);

  const stateColor = orbState === "idle" ? "#38bdf8"
    : orbState === "searching" ? "#f59e0b"
    : orbState === "completed" ? "#10b981"
    : orbState === "error" ? "#f43f5e"
    : "#94a3b8";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', 'SF Mono', monospace",
      fontSize: 12,
      lineHeight: 1.5,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        paddingBottom: 8,
        borderBottom: "1px solid rgba(56, 189, 248, 0.12)",
        marginBottom: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "#38bdf8" }}>{">"}</span>
          <span style={{ color: "rgba(226, 232, 240, 0.85)" }}>outeye v2.0</span>
          <span style={{ color: "rgba(148, 163, 184, 0.5)" }}>·</span>
          <span style={{ color: stateColor, transition: "color 800ms ease" }}>
            {orbState === "idle" ? "standby" : orbState}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "rgba(148, 163, 184, 0.5)",
              cursor: "pointer",
              fontSize: 14,
              padding: "0 4px",
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Output area */}
      <div
        ref={outputRef}
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 4,
          marginBottom: 8,
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            {msg.role === "user" ? (
              <div style={{ display: "flex", gap: 6 }}>
                <span style={{ color: "#38bdf8", flexShrink: 0 }}>outeye:~$</span>
                <span style={{ color: "rgba(226, 232, 240, 0.85)" }}>{msg.content}</span>
              </div>
            ) : msg.role === "system" ? (
              <div style={{ color: "rgba(148, 163, 184, 0.6)" }}>
                {msg.content.split("\n").map((line, j) => (
                  <div key={j}>{line}</div>
                ))}
              </div>
            ) : (
              <div style={{ color: "rgba(226, 232, 240, 0.85)", paddingLeft: 0 }}>
                {msg.content.split("\n").map((line, j) => (
                  <div key={j}>{line}</div>
                ))}
                {isStreaming && i === messages.length - 1 && (
                  <span style={{
                    color: stateColor,
                    fontWeight: 700,
                    animation: "cursor-blink 1.5s step-end infinite",
                  }}>▋</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        borderTop: "1px solid rgba(56, 189, 248, 0.12)",
        paddingTop: 8,
      }}>
        <span style={{ color: "#38bdf8", flexShrink: 0 }}>outeye:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => onIMEChange?.(true)}
          onCompositionEnd={(e) => {
            onIMEChange?.(false);
            setInput((e.target as HTMLInputElement).value);
            // Refocus after IME composition completes
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          disabled={isStreaming}
          placeholder={isStreaming ? "等待回复中..." : "输入问题或命令..."}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "rgba(226, 232, 240, 0.85)",
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: "inherit",
          }}
          autoComplete="off"
          spellCheck={false}
        />
      </form>

      <style>{`@keyframes cursor-blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
});
