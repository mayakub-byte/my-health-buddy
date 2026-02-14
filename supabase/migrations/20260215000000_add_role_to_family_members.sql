-- Add role column to family_members for relationship/role (father, mother, etc.)
-- Run in Supabase SQL editor if migrations are not used

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS role text;
