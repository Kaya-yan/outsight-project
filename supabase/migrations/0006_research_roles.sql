-- 0006_research_roles: decouple research role from system role
-- research_roles is a JSONB array of strings: ["coder", "reviewer", "team_lead"]
-- system role (profiles.role) controls system access only.
-- research_roles control task creation, assignment, review, arbitration.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS research_roles jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: give existing admin/lead_researcher the team_lead research role
UPDATE profiles
SET research_roles = '["team_lead"]'::jsonb
WHERE role IN ('admin', 'lead_researcher');

-- Give researcher and coder the coder research role
UPDATE profiles
SET research_roles = '["coder"]'::jsonb
WHERE role IN ('researcher', 'coder');
