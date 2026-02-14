-- Add dob column to family_members for Date of Birth
-- Run in Supabase SQL editor if migrations are not used:
-- ALTER TABLE family_members ADD COLUMN IF NOT EXISTS dob date;
-- ALTER TABLE family_members ADD COLUMN IF NOT EXISTS age_group text;

ALTER TABLE family_members ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS age_group text;
