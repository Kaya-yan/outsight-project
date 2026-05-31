/**
 * Shared MIMO API client using Anthropic Messages API with streaming.
 * All MIMO calls should go through this module.
 */

const BASE_URL = process.env.MIMO_BASE_URL || "https://token-plan-cn.xiaomimimo.com/anthropic";
const API_KEY = process.env.MIMO_API_KEY || "";
const MODEL = "mimo-v2.5-pro";

const LOG_PREFIX = "[MIMO]";

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
  if (!API_KEY) {
    console.error(`${LOG_PREFIX} API key not configured`);
    return { text: null, error: "MIMO_API_KEY 未配置" };
  }

  const maxTokens = opts?.maxTokens ?? 512;
  const timeoutMs = opts?.timeoutMs ?? 45000;

  console.log(`${LOG_PREFIX} Request: model=${MODEL}, maxTokens=${maxTokens}, timeout=${timeoutMs}ms, systemLen=${systemPrompt.length}, userLen=${userPrompt.length}`);

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const reqStart = Date.now();
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

      console.log(`${LOG_PREFIX} Response: status=${res.status}, attempt=${attempt + 1}, latency=${Date.now() - reqStart}ms`);

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.error(`${LOG_PREFIX} HTTP error ${res.status}: ${errBody.slice(0, 500)}`);
        if (attempt < 2) {
          // Respect Retry-After header for 429, otherwise use longer backoff
          const retryAfter = res.headers.get("Retry-After");
          const waitMs = retryAfter
            ? parseInt(retryAfter, 10) * 1000
            : (attempt + 1) * 5000; // 5s, 10s
          console.warn(`${LOG_PREFIX} Retrying in ${waitMs}ms (attempt ${attempt + 2}/3)`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        return { text: null, error: `API ${res.status}: ${errBody.slice(0, 100)}` };
      }

      // Collect streamed text
      const reader = res.body?.getReader();
      if (!reader) {
        console.error(`${LOG_PREFIX} No response body reader available`);
        return { text: null, error: "无法读取响应流" };
      }

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
            // Handle API error events (rate limit, content policy, etc.)
            if (parsed.type === "error") {
              const errMsg = parsed.error?.message ?? parsed.message ?? "API stream error";
              console.error(`${LOG_PREFIX} SSE error event: ${errMsg}`);
              return { text: null, error: errMsg };
            }
          } catch {
            // skip malformed chunks
          }
        }
      }

      if (!hasContent || !fullText.trim()) {
        console.warn(`${LOG_PREFIX} Empty content: hasContent=${hasContent}, fullTextLen=${fullText.length}, attempt=${attempt + 1}`);
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, (attempt + 1) * 5000)); // 5s, 10s
          continue;
        }
        console.error(`${LOG_PREFIX} All 3 attempts returned empty content`);
        return { text: null, error: "API 返回空内容" };
      }

      const resultText = fullText.trim();
      console.log(`${LOG_PREFIX} Success: textLen=${resultText.length}, latency=${Date.now() - reqStart}ms`);
      return { text: resultText, error: null };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "请求失败";
      const errName = err instanceof Error ? err.name : "Unknown";
      console.error(`${LOG_PREFIX} Exception (attempt ${attempt + 1}): name=${errName}, message=${errMsg}`);
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 5000)); // 5s, 10s
        continue;
      }
      return { text: null, error: errMsg };
    }
  }

  return { text: null, error: "重试耗尽" };
}
