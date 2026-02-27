-- Add avatar_url column for profile photo support
ALTER TABLE family_members ADD COLUMN IF NOT EXISTS avatar_url text;
