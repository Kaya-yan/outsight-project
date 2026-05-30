/**
 * Shared MIMO API client using Anthropic Messages API with streaming.
 * All MIMO calls should go through this module.
 */

const BASE_URL = process.env.MIMO_BASE_URL || "https://token-plan-cn.xiaomimimo.com/anthropic";
const API_KEY = process.env.MIMO_API_KEY || "";
const MODEL = "mimo-v2.5-pro";

export interface MimoResult {
  text: string | null;
  error: string | null;
}

/**
 * Call MIMO API with streaming (the only mode this provider supports reliably).
 * Collects all SSE chunks and returns the full text.
 */
export async function callMimoStream(
  systemPrompt: string,
  userPrompt: string,
  opts?: { maxTokens?: number; timeoutMs?: number },
): Promise<MimoResult> {
  if (!API_KEY) return { text: null, error: "MIMO_API_KEY 未配置" };

  const maxTokens = opts?.maxTokens ?? 512;
  const timeoutMs = opts?.timeoutMs ?? 45000;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/v1/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          stream: true,
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        if (attempt < 2) {
          // Respect Retry-After header for 429, otherwise use longer backoff
          const retryAfter = res.headers.get("Retry-After");
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : (attempt + 1) * 5000; // 5s, 10s
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        return { text: null, error: `API ${res.status}: ${errBody.slice(0, 100)}` };
      }

      // Collect streamed text
      const reader = res.body?.getReader();
      if (!reader) return { text: null, error: "无法读取响应流" };

      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      let hasContent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);

          try {
            const parsed = JSON.parse(payload);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              hasContent = true;
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      if (!hasContent || !fullText.trim()) {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 5000)); // 5s, 10s
          continue;
        }
        return { text: null, error: "API 返回空内容" };
      }

      return { text: fullText.trim(), error: null };
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 5000)); // 5s, 10s
        continue;
      }
      return { text: null, error: err instanceof Error ? err.message : "请求失败" };
    }
  }

  return { text: null, error: "重试耗尽" };
}
