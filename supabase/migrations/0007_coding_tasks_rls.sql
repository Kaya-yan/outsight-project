-- 0007_coding_tasks_rls: complete RLS policies for coding_tasks
-- Fixes "new row violates row-level security policy for table coding_tasks"

-- 0. Fix profiles trigger: assign default research_roles to new users
--    (new users after migration 0006 get empty array; backfill below)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, display_name, role, research_roles)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'researcher',
    '["coder"]'::jsonb
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill: any profile with empty research_roles gets a default based on system role
UPDATE profiles SET research_roles = '["coder"]'::jsonb
WHERE research_roles IS NULL OR research_roles = '[]'::jsonb;

UPDATE profiles SET research_roles = '["coder", "team_lead"]'::jsonb
WHERE role IN ('admin', 'lead_researcher') AND (research_roles = '["coder"]'::jsonb);

-- 1. Enable RLS
ALTER TABLE coding_tasks ENABLE ROW LEVEL SECURITY;

-- ── SELECT policies ──

-- Any authenticated user can see tasks they're assigned to
CREATE POLICY "tasks_select_own" ON coding_tasks
  FOR SELECT TO authenticated
  USING (
    coder_a_id = auth.uid()
    OR coder_b_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR created_by = auth.uid()
  );

-- Everyone can see unassigned pool tasks (status=open, coder_a_id IS NULL)
CREATE POLICY "tasks_select_pool" ON coding_tasks
  FOR SELECT TO authenticated
  USING (coder_a_id IS NULL AND status = 'open');

-- Team leads can see all tasks
CREATE POLICY "tasks_select_team_lead" ON coding_tasks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND research_roles ? 'team_lead'
    )
  );

-- ── INSERT policies ──

-- Users can create tasks where they are the creator
-- (Allows solo/dual/pool — coder_a_id and coder_b_id can be null)
CREATE POLICY "tasks_insert_creator" ON coding_tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- ── UPDATE policies ──

-- Assigned coders can update their own in-progress tasks (e.g., submit done)
CREATE POLICY "tasks_update_own" ON coding_tasks
  FOR UPDATE TO authenticated
  USING (
    (coder_a_id = auth.uid() OR coder_b_id = auth.uid())
    AND status IN ('open', 'in_progress')
  )
  WITH CHECK (
    (coder_a_id = auth.uid() OR coder_b_id = auth.uid())
    AND status IN ('open', 'in_progress', 'completed')
  );

-- Reviewers and team leads can update completed tasks (review/arbitrate)
CREATE POLICY "tasks_update_reviewer" ON coding_tasks
  FOR UPDATE TO authenticated
  USING (
    status = 'completed'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND (research_roles ? 'reviewer' OR research_roles ? 'team_lead')
    )
  )
  WITH CHECK (
    status IN ('completed', 'reviewed')
  );

-- Team leads can update any task (reassign, adjust status)
CREATE POLICY "tasks_update_team_lead" ON coding_tasks
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND research_roles ? 'team_lead'
    )
  );

-- ── DELETE policies ──

-- Only team leads can delete tasks
CREATE POLICY "tasks_delete_team_lead" ON coding_tasks
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND research_roles ? 'team_lead'
    )
  );

-- ── Allow service_role full access (supabase_functions or admin API) ──
-- service_role bypasses RLS by default in Supabase — no policy needed.
-- But we explicitly grant for clarity:
ALTER TABLE coding_tasks FORCE ROW LEVEL SECURITY;
