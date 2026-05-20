-- 0008_literature_hub: literature notes sharing module
-- Independent from articles / coding_tasks / annotations

-- 1. literature_notes
CREATE TABLE literature_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text,
  publish_date text,
  journal text,
  url text,
  summary text,
  abstract text,
  key_points text[] DEFAULT '{}',
  inspiration text,
  notes text,
  for_review boolean DEFAULT false,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  tags text[] DEFAULT '{}',
  attachment_path text,
  attachment_name text,
  read_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id),
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. literature_comments
CREATE TABLE literature_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES literature_notes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  parent_id uuid REFERENCES literature_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. literature_reactions
CREATE TABLE literature_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid NOT NULL REFERENCES literature_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  reaction_type text NOT NULL CHECK (reaction_type IN ('read', 'like')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, user_id, reaction_type)
);

-- 4. Indexes
CREATE INDEX idx_lit_notes_tags ON literature_notes USING gin(tags);
CREATE INDEX idx_lit_notes_for_review ON literature_notes(for_review);
CREATE INDEX idx_lit_notes_rating ON literature_notes(rating);
CREATE INDEX idx_lit_comments_note ON literature_comments(note_id);
CREATE INDEX idx_lit_reactions_note ON literature_reactions(note_id);

-- 5. RLS
ALTER TABLE literature_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE literature_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE literature_reactions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can SELECT any literature
CREATE POLICY "lit_notes_select" ON literature_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "lit_comments_select" ON literature_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "lit_reactions_select" ON literature_reactions FOR SELECT TO authenticated USING (true);

-- All authenticated users can INSERT (with ownership check)
CREATE POLICY "lit_notes_insert" ON literature_notes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "lit_comments_insert" ON literature_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "lit_reactions_insert" ON literature_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- All authenticated users can UPDATE any literature note (full collaboration)
CREATE POLICY "lit_notes_update" ON literature_notes FOR UPDATE TO authenticated USING (true);

-- All authenticated users can DELETE any literature note
CREATE POLICY "lit_notes_delete" ON literature_notes FOR DELETE TO authenticated USING (true);

-- Users manage their own comments/reactions
CREATE POLICY "lit_comments_delete" ON literature_comments FOR DELETE TO authenticated USING (author_id = auth.uid());
CREATE POLICY "lit_reactions_delete" ON literature_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION update_lit_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lit_notes_updated_at
  BEFORE UPDATE ON literature_notes
  FOR EACH ROW EXECUTE FUNCTION update_lit_updated_at();
