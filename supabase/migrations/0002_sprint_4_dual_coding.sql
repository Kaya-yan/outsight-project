-- ============================================================
-- Sprint 4: Dual coding rounds table
-- Track inter-coder reliability for dual coding workflow
-- ============================================================

create table if not exists public.dual_coding_rounds (
  id              uuid primary key default uuid_generate_v4(),
  article_id      uuid not null references public.articles(id) on delete cascade,
  coder_a_id      uuid not null references public.profiles(id),
  coder_b_id      uuid not null references public.profiles(id),
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'both_done', 'disputed', 'arbitrated')),
  agreement_rate  real,
  kappa           real,
  arbiter_id      uuid references public.profiles(id),
  arbiter_note    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(article_id)
);

create index if not exists idx_dcr_status on public.dual_coding_rounds(status);
create index if not exists idx_dcr_coder_a on public.dual_coding_rounds(coder_a_id);
create index if not exists idx_dcr_coder_b on public.dual_coding_rounds(coder_b_id);

-- Auto-update updated_at
create trigger set_updated_at_dcr before update on public.dual_coding_rounds
  for each row execute function public.set_updated_at();

-- RLS
alter table public.dual_coding_rounds enable row level security;

create policy "DCR viewable by authenticated users"
  on public.dual_coding_rounds for select using (auth.role() = 'authenticated');

create policy "Admins and leads can manage DCR"
  on public.dual_coding_rounds for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

create policy "Admins and leads can update DCR"
  on public.dual_coding_rounds for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );
