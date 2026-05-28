-- ============================================================
-- Migration 0010: Add content_fetched_at + paywalled status
-- ============================================================

-- 1. Add content_fetched_at column
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS content_fetched_at timestamptz;

-- 2. Update full_text_status CHECK constraint to include 'paywalled'
ALTER TABLE public.articles
  DROP CONSTRAINT IF EXISTS articles_full_text_status_check;

ALTER TABLE public.articles
  ADD CONSTRAINT articles_full_text_status_check
  CHECK (full_text_status IN ('missing', 'partial', 'complete', 'manual_uploaded', 'paywalled'));

-- 3. Index for content_fetched_at (useful for batch queries)
CREATE INDEX IF NOT EXISTS idx_articles_content_fetched_at ON public.articles(content_fetched_at);
