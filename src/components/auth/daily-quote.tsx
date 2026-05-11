"use client";

import { getDailyQuote } from "@/lib/quotes";
import { Quote } from "lucide-react";

export function DailyQuote() {
  const quote = getDailyQuote();

  return (
    <div className="flex items-start gap-3 py-4">
      <Quote className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div>
        <blockquote className="text-sm italic text-muted-foreground leading-relaxed">
          &ldquo;{quote.text}&rdquo;
        </blockquote>
        <cite className="mt-2 block text-xs text-muted not-italic">
          &mdash; {quote.author}
          {quote.source && (
            <span className="text-muted">，《{quote.source}》</span>
          )}
        </cite>
      </div>
    </div>
  );
}
