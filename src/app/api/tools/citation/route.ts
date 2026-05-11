import { NextResponse } from "next/server";

interface CitationFields {
  authors: string;
  title: string;
  journal: string;
  year: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
}

function formatGB7714(f: CitationFields): string {
  const authors = f.authors.replace(/;/g, ", ");
  let result = `${authors}. ${f.title}[J]. ${f.journal}`;
  if (f.year) result += `, ${f.year}`;
  if (f.volume) result += `, ${f.volume}`;
  if (f.issue) result += `(${f.issue})`;
  if (f.pages) result += `: ${f.pages}`;
  if (f.doi) result += `. DOI:${f.doi}`;
  return result + ".";
}

function formatAPA(f: CitationFields): string {
  const firstAuthor = f.authors.split(";")[0].trim().split(",")[0].trim();
  let result = `${firstAuthor}`;
  if (f.year) result += ` (${f.year})`;
  result += `. ${f.title}. *${f.journal}*`;
  if (f.volume) result += `, *${f.volume}*`;
  if (f.issue) result += `(${f.issue})`;
  if (f.pages) result += `, ${f.pages}`;
  if (f.doi) result += `. https://doi.org/${f.doi}`;
  return result + ".";
}

function formatMLA(f: CitationFields): string {
  const firstAuthor = f.authors.split(";")[0].trim().split(",")[0].trim();
  let result = `${firstAuthor}. "${f.title}." *${f.journal}*`;
  if (f.volume) result += `, vol. ${f.volume}`;
  if (f.issue) result += `, no. ${f.issue}`;
  if (f.year) result += `, ${f.year}`;
  if (f.pages) result += `, pp. ${f.pages}`;
  if (f.doi) result += `. DOI:${f.doi}`;
  return result + ".";
}

export async function POST(request: Request) {
  const body = await request.json();

  // If DOI provided, try to fetch metadata from Crossref
  if (body.doi && !body.title) {
    try {
      const res = await fetch(`https://api.crossref.org/works/${body.doi}`, {
        headers: { "User-Agent": "OutSight/0.1 (Academic Tool)" },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const json = await res.json();
        const msg = json.message;
        if (msg) {
          body.title = msg.title?.[0] ?? body.title;
          body.authors = msg.author?.map((a: { family?: string; given?: string }) =>
            `${a.family ?? ""}, ${(a.given ?? "").charAt(0)}`
          ).join("; ") ?? body.authors;
          body.journal = msg["container-title"]?.[0] ?? body.journal;
          body.year = msg["published-print"]?.["date-parts"]?.[0]?.[0]?.toString()
            ?? msg["created"]?.["date-parts"]?.[0]?.[0]?.toString()
            ?? body.year;
          body.volume = msg.volume ?? body.volume;
          body.issue = msg.issue ?? body.issue;
          body.pages = msg.page ?? body.pages;
        }
      }
    } catch {
      // Crossref fetch failed, use manually entered fields
    }
  }

  if (!body.authors || !body.title) {
    return NextResponse.json({ error: "请填写作者和标题" }, { status: 400 });
  }

  const fields: CitationFields = {
    authors: body.authors ?? "",
    title: body.title ?? "",
    journal: body.journal ?? "",
    year: body.year ?? "",
    volume: body.volume ?? "",
    issue: body.issue ?? "",
    pages: body.pages ?? "",
    doi: body.doi ?? "",
  };

  return NextResponse.json({
    success: true,
    citations: {
      gb7714: formatGB7714(fields),
      apa: formatAPA(fields),
      mla: formatMLA(fields),
    },
    fetched: !!body.doi,
  });
}
