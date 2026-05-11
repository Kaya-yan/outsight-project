-- ============================================================
-- Sprint 1: Articles table migration
-- Add media, status, period, AI fields, and content columns
-- ============================================================

-- 1. Add new columns (all nullable at first to avoid conflicts)
alter table public.articles add column if not exists media text;
alter table public.articles add column if not exists content text;
alter table public.articles add column if not exists period text;
alter table public.articles add column if not exists status text;
alter table public.articles add column if not exists keyword_combo text[] default '{}';
alter table public.articles add column if not exists ai_summary text;
alter table public.articles add column if not exists ai_sentiment text;
alter table public.articles add column if not exists ai_confidence real check (ai_confidence >= 0 and ai_confidence <= 1);
alter table public.articles add column if not exists ai_framework_hint text;
alter table public.articles add column if not exists ai_evidence_quotes text[] default '{}';
alter table public.articles add column if not exists created_by uuid references public.profiles(id);

-- 2. Populate new columns from existing data
update public.articles set media = source where media is null;
update public.articles set content = full_text where content is null;
update public.articles set status = case
  when is_archived then '已封存'
  else '已入库'
end where status is null;

-- 3. Make status NOT NULL and add CHECK constraint
alter table public.articles alter column status set not null;
alter table public.articles add constraint articles_status_check
  check (status in ('待发现','已入库','已下载全文','已清洗','已预读','待编码','编码完成','已封存'));

-- 4. Add indexes for new query patterns
create index if not exists idx_articles_status on public.articles(status);
create index if not exists idx_articles_period on public.articles(period);
create index if not exists idx_articles_media on public.articles(media);
create index if not exists idx_articles_created_by on public.articles(created_by);
create index if not exists idx_articles_keyword_combo on public.articles using gin(keyword_combo);

-- 5. Add content search index (English text search)
create index if not exists idx_articles_content_search on public.articles
  using gin(to_tsvector('english', coalesce(content, '') || ' ' || coalesce(title, '')));

-- 6. RLS policies for articles already exist at table level (authenticated users can select/insert/update),
-- so new columns are automatically covered. No RLS changes needed.
