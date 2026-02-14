-- Add relationship column to family_members
-- Run in Supabase SQL editor if migrations are not used:
-- ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relationship text;

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS relationship text;
