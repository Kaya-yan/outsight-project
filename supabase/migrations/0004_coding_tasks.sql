-- 0004_coding_tasks: task-driven research workflow
-- Phase 1 — minimum viable refactor
-- Only adds tables/columns, never drops or renames. Fully rollback-safe.

-- 1. Create coding_tasks table
CREATE TABLE IF NOT EXISTS coding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  task_type text NOT NULL DEFAULT 'solo' CHECK (task_type IN ('solo', 'dual')),
  framework_id uuid REFERENCES coding_frameworks(id),

  -- assignees
  coder_a_id uuid NOT NULL REFERENCES profiles(id),
  coder_b_id uuid REFERENCES profiles(id),
  reviewer_id uuid REFERENCES profiles(id),

  -- state: only 4 values, linear forward-only
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'completed', 'reviewed')),

  -- per-coder completion flags (dual uses both, solo uses only coder_a_done)
  coder_a_done boolean NOT NULL DEFAULT false,
  coder_b_done boolean NOT NULL DEFAULT false,

  -- dual-coding stats (populated when both coders done)
  agreement_rate double precision,
  kappa double precision,

  -- review
  reviewer_note text,
  reviewed_at timestamptz,

  -- metadata
  priority integer NOT NULL DEFAULT 0,
  due_date timestamptz,
  notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add task_id to annotations
ALTER TABLE annotations ADD COLUMN IF NOT EXISTS task_id uuid REFERENCES coding_tasks(id);
CREATE INDEX IF NOT EXISTS idx_annotations_task ON annotations(task_id);

-- 3. Migrate existing dual_coding_rounds → coding_tasks
INSERT INTO coding_tasks (id, article_id, task_type,
  coder_a_id, coder_b_id, status,
  coder_a_done, coder_b_done,
  agreement_rate, kappa,
  reviewer_id, reviewer_note,
  created_by, created_at, updated_at)
SELECT
  dcr.id, dcr.article_id, 'dual',
  dcr.coder_a_id, dcr.coder_b_id,
  CASE dcr.status
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'both_done' THEN 'completed'
    WHEN 'disputed' THEN 'completed'
    WHEN 'arbitrated' THEN 'reviewed'
    ELSE 'open'
  END,
  CASE WHEN dcr.status IN ('both_done', 'disputed', 'arbitrated') THEN true ELSE false END,
  CASE WHEN dcr.status IN ('both_done', 'disputed', 'arbitrated') THEN true ELSE false END,
  dcr.agreement_rate, dcr.kappa,
  dcr.arbiter_id, dcr.arbiter_note,
  dcr.coder_a_id, dcr.created_at, dcr.updated_at
FROM dual_coding_rounds dcr
WHERE NOT EXISTS (SELECT 1 FROM coding_tasks ct WHERE ct.id = dcr.id);

-- 4. Migrate existing assignments → coding_tasks (where no coder-task conflict)
INSERT INTO coding_tasks (article_id, task_type,
  coder_a_id, status,
  coder_a_done,
  created_by, created_at, updated_at)
SELECT
  a.article_id, 'solo',
  a.assignee_id,
  CASE a.status
    WHEN 'assigned' THEN 'open'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'completed' THEN 'completed'
    WHEN 'reviewed' THEN 'reviewed'
    WHEN 'disputed' THEN 'completed'
    ELSE 'open'
  END,
  CASE WHEN a.status IN ('completed', 'reviewed') THEN true ELSE false END,
  a.assigned_by, a.created_at, a.updated_at
FROM assignments a
WHERE NOT EXISTS (
  SELECT 1 FROM coding_tasks ct
  WHERE ct.article_id = a.article_id AND ct.coder_a_id = a.assignee_id
);

-- 5. Backfill annotations.task_id for dual-coding annotations
UPDATE annotations an
SET task_id = dcr.id
FROM dual_coding_rounds dcr
WHERE an.article_id = dcr.article_id
  AND an.task_id IS NULL
  AND (an.coder_id = dcr.coder_a_id OR an.coder_id = dcr.coder_b_id);
