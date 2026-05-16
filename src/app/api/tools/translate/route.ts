import { NextResponse } from "next/server";

const TRANSLATE_URL = "https://translate.argosopentech.com/translate";

export async function POST(request: Request) {
  try {
    const { q, source, target } = await request.json();
    if (!q || typeof q !== "string" || q.length > 5000) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const res = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, source: source || "en", target: target || "zh", format: "text" }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Translation failed" }, { status: 500 });
  }
}
