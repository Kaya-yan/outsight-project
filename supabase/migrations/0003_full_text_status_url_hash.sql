-- ============================================================
-- Migration 0003: Full-text tracking + URL dedup + DELETE RLS
-- ============================================================

-- 1. Add full_text_status column
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS full_text_status text DEFAULT 'missing'
  CHECK (full_text_status IN ('missing', 'partial', 'complete', 'manual_uploaded'));

-- 2. Populate full_text_status for existing articles
UPDATE public.articles
  SET full_text_status = CASE
    WHEN full_text IS NOT NULL AND length(full_text) >= 50 THEN 'complete'
    ELSE 'missing'
  END;

-- 3. Add url_hash column
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS url_hash text;

-- 4. Populate url_hash for existing rows
UPDATE public.articles
  SET url_hash = encode(
    digest(trim(trailing '/' from lower(url)), 'sha256'),
    'hex'
  )
  WHERE url_hash IS NULL;

-- 5. Add UNIQUE constraint on url_hash
DO $$
BEGIN
  ALTER TABLE public.articles ADD CONSTRAINT articles_url_hash_unique UNIQUE (url_hash);
EXCEPTION WHEN duplicate_table THEN
  RAISE NOTICE 'Constraint articles_url_hash_unique already exists';
END $$;

-- 6. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_articles_url_hash ON public.articles(url_hash);
CREATE INDEX IF NOT EXISTS idx_articles_full_text_status ON public.articles(full_text_status);

-- 7. DELETE RLS policy (fix for delete failure)
CREATE POLICY "Admins and leads can delete articles"
  ON public.articles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('admin', 'lead_researcher')
    )
  );
