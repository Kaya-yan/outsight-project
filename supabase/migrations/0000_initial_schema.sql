-- ============================================================
-- OutSight Platform: Initial Schema (Sprint 0)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. profiles — extends auth.users
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  username      text not null unique,
  display_name  text,
  email         text not null unique,
  avatar_url    text,
  role          text not null default 'researcher'
                check (role in ('admin', 'lead_researcher', 'researcher', 'coder', 'viewer')),
  institution   text,
  is_active     boolean not null default true,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_profiles_username on public.profiles(username);
create index idx_profiles_role on public.profiles(role);
create index idx_profiles_email on public.profiles(email);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'researcher'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. coding_frameworks
-- ============================================================
create table if not exists public.coding_frameworks (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  name_zh       text,
  description   text,
  version       integer not null default 1,
  is_active     boolean not null default true,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_coding_frameworks_active on public.coding_frameworks(is_active);

-- ============================================================
-- 3. coding_nodes
-- ============================================================
create table if not exists public.coding_nodes (
  id            uuid primary key default uuid_generate_v4(),
  framework_id  uuid not null references public.coding_frameworks(id) on delete cascade,
  parent_id     uuid references public.coding_nodes(id) on delete set null,
  code          text not null,
  label         text not null,
  label_zh      text,
  description   text,
  level         integer not null default 0,
  lft           integer,
  rgt           integer,
  color         text default '#4A90A4',
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(framework_id, code)
);

create index idx_coding_nodes_framework on public.coding_nodes(framework_id);
create index idx_coding_nodes_parent on public.coding_nodes(parent_id);
create index idx_coding_nodes_lft_rgt on public.coding_nodes(framework_id, lft, rgt);

-- ============================================================
-- 4. articles
-- ============================================================
create table if not exists public.articles (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,
  title_zh      text,
  url           text not null,
  source        text not null,
  source_type   text default 'mainstream_media'
                check (source_type in ('mainstream_media', 'social_media', 'academic_journal', 'government', 'other')),
  publish_date  date,
  language      text not null default 'en' check (language in ('en', 'zh', 'bilingual')),
  author        text,
  abstract      text,
  full_text     text,
  word_count    integer,
  keywords      text[] default '{}',
  region        text,
  metadata      jsonb default '{}'::jsonb,
  is_archived   boolean not null default false,
  archived_at   timestamptz,
  collection_batch_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_articles_source on public.articles(source);
create index idx_articles_publish_date on public.articles(publish_date);
create index idx_articles_archived on public.articles(is_archived);
create index idx_articles_language on public.articles(language);
create index idx_articles_search on public.articles
  using gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(full_text, '')));

-- ============================================================
-- 5. annotations
-- ============================================================
create table if not exists public.annotations (
  id            uuid primary key default uuid_generate_v4(),
  article_id    uuid not null references public.articles(id) on delete cascade,
  node_id       uuid not null references public.coding_nodes(id) on delete cascade,
  coder_id      uuid not null references public.profiles(id),
  quote_text    text,
  start_offset  integer,
  end_offset    integer,
  note          text,
  confidence    real check (confidence >= 0 and confidence <= 1),
  is_resolved   boolean not null default false,
  resolved_by   uuid references public.profiles(id),
  resolved_at   timestamptz,
  metadata      jsonb default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_annotations_article on public.annotations(article_id);
create index idx_annotations_coder on public.annotations(coder_id);
create index idx_annotations_node on public.annotations(node_id);
create index idx_annotations_resolved on public.annotations(is_resolved);

-- ============================================================
-- 6. assignments
-- ============================================================
create table if not exists public.assignments (
  id            uuid primary key default uuid_generate_v4(),
  article_id    uuid not null references public.articles(id) on delete cascade,
  assignee_id   uuid not null references public.profiles(id),
  assigned_by   uuid not null references public.profiles(id),
  status        text not null default 'assigned'
                check (status in ('assigned', 'in_progress', 'completed', 'reviewed', 'disputed')),
  priority      integer not null default 0,
  due_date      timestamptz,
  completed_at  timestamptz,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(article_id, assignee_id)
);

create index idx_assignments_assignee on public.assignments(assignee_id);
create index idx_assignments_status on public.assignments(status);

-- ============================================================
-- 7. collection_logs
-- ============================================================
create table if not exists public.collection_logs (
  id            uuid primary key default uuid_generate_v4(),
  batch_id      uuid not null,
  source        text not null,
  query_params  jsonb default '{}'::jsonb,
  articles_fetched integer not null default 0,
  articles_new  integer not null default 0,
  status        text not null default 'running'
                check (status in ('running', 'completed', 'failed', 'partial')),
  error_message text,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  triggered_by  uuid references public.profiles(id)
);

create index idx_collection_logs_batch on public.collection_logs(batch_id);
create index idx_collection_logs_status on public.collection_logs(status);

-- ============================================================
-- 8. activity_logs
-- ============================================================
create table if not exists public.activity_logs (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id),
  action        text not null,
  entity_type   text not null,
  entity_id     uuid,
  details       jsonb default '{}'::jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz not null default now()
);

create index idx_activity_logs_user on public.activity_logs(user_id);
create index idx_activity_logs_action on public.activity_logs(action);
create index idx_activity_logs_created on public.activity_logs(created_at);

-- ============================================================
-- 9. ai_queue
-- ============================================================
create table if not exists public.ai_queue (
  id            uuid primary key default uuid_generate_v4(),
  job_type      text not null
                check (job_type in ('summarize', 'classify', 'sentiment',
                                    'extract_entities', 'suggest_codes', 'translate', 'qa')),
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  priority      integer not null default 0,
  payload       jsonb not null default '{}'::jsonb,
  result        jsonb,
  model         text not null default 'deepseek-chat',
  tokens_used   integer,
  error_message text,
  retry_count   integer not null default 0,
  max_retries   integer not null default 3,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

create index idx_ai_queue_status on public.ai_queue(status, priority);
create index idx_ai_queue_type on public.ai_queue(job_type);

-- ============================================================
-- 10. ai_prompts
-- ============================================================
create table if not exists public.ai_prompts (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  description   text,
  job_type      text not null,
  system_prompt text not null,
  user_prompt_template text not null,
  variables     jsonb default '[]'::jsonb,
  model         text not null default 'deepseek-chat',
  temperature   real default 0.3,
  max_tokens    integer default 2048,
  is_active     boolean not null default true,
  created_by    uuid references public.profiles(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_ai_prompts_job_type on public.ai_prompts(job_type);
create index idx_ai_prompts_active on public.ai_prompts(is_active);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.coding_frameworks enable row level security;
alter table public.coding_nodes enable row level security;
alter table public.articles enable row level security;
alter table public.annotations enable row level security;
alter table public.assignments enable row level security;
alter table public.collection_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.ai_queue enable row level security;
alter table public.ai_prompts enable row level security;

-- Profiles
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Coding Frameworks
create policy "Frameworks are viewable by authenticated users"
  on public.coding_frameworks for select using (auth.role() = 'authenticated');

create policy "Admins and leads can manage frameworks"
  on public.coding_frameworks for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

create policy "Admins and leads can update frameworks"
  on public.coding_frameworks for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

-- Coding Nodes
create policy "Nodes are viewable by authenticated users"
  on public.coding_nodes for select using (auth.role() = 'authenticated');

create policy "Admins and leads can manage nodes"
  on public.coding_nodes for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

create policy "Admins and leads can update nodes"
  on public.coding_nodes for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

-- Articles
create policy "Articles are viewable by authenticated users"
  on public.articles for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert articles"
  on public.articles for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update articles"
  on public.articles for update using (auth.role() = 'authenticated');

-- Annotations
create policy "Annotations are viewable by authenticated users"
  on public.annotations for select using (auth.role() = 'authenticated');

create policy "Users can create own annotations"
  on public.annotations for insert with check (auth.uid() = coder_id);

create policy "Users can update own annotations"
  on public.annotations for update using (auth.uid() = coder_id) with check (auth.uid() = coder_id);

-- Assignments
create policy "Assignments are viewable by authenticated users"
  on public.assignments for select using (auth.role() = 'authenticated');

create policy "Admins and leads can manage assignments"
  on public.assignments for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

create policy "Admins and leads can update assignments"
  on public.assignments for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'lead_researcher'))
  );

-- Collection Logs
create policy "Collection logs are viewable by authenticated users"
  on public.collection_logs for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert collection logs"
  on public.collection_logs for insert with check (auth.role() = 'authenticated');

-- Activity Logs
create policy "Activity logs are viewable by authenticated users"
  on public.activity_logs for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert activity logs"
  on public.activity_logs for insert with check (auth.uid() = user_id);

-- AI Queue
create policy "AI queue is viewable by authenticated users"
  on public.ai_queue for select using (auth.role() = 'authenticated');

create policy "Authenticated users can enqueue jobs"
  on public.ai_queue for insert with check (auth.role() = 'authenticated');

-- AI Prompts
create policy "AI prompts are viewable by authenticated users"
  on public.ai_prompts for select using (auth.role() = 'authenticated');

create policy "Admins can manage prompts"
  on public.ai_prompts for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update prompts"
  on public.ai_prompts for update using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================
-- Auto-update updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at_profiles before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_frameworks before update on public.coding_frameworks
  for each row execute function public.set_updated_at();

create trigger set_updated_at_nodes before update on public.coding_nodes
  for each row execute function public.set_updated_at();

create trigger set_updated_at_articles before update on public.articles
  for each row execute function public.set_updated_at();

create trigger set_updated_at_annotations before update on public.annotations
  for each row execute function public.set_updated_at();

create trigger set_updated_at_assignments before update on public.assignments
  for each row execute function public.set_updated_at();

create trigger set_updated_at_prompts before update on public.ai_prompts
  for each row execute function public.set_updated_at();

-- ============================================================
-- Helper Functions
-- ============================================================

-- Archive articles older than a given cutoff date
create or replace function public.archive_old_articles(cutoff timestamptz)
returns integer as $$
declare
  archived_count integer;
begin
  update public.articles
  set is_archived = true, archived_at = now()
  where is_archived = false
    and created_at < cutoff
    and id not in (
      select distinct article_id from public.assignments
      where status in ('assigned', 'in_progress')
    );

  get diagnostics archived_count = row_count;
  return archived_count;
end;
$$ language plpgsql security definer;
