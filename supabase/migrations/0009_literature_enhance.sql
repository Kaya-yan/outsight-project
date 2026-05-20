-- 0009_literature_enhance: add research_method + reader tracking

ALTER TABLE literature_notes ADD COLUMN IF NOT EXISTS research_method text;
ALTER TABLE literature_notes ADD COLUMN IF NOT EXISTS reader_name text;

-- Backfill reader_name from profiles for existing notes
UPDATE literature_notes ln
SET reader_name = p.display_name
FROM profiles p
WHERE ln.created_by = p.id AND ln.reader_name IS NULL;
