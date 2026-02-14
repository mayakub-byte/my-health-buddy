-- Fix RLS policy for family_members - allow users to manage members of their own families
-- Run in Supabase SQL editor if migrations are not used

DROP POLICY IF EXISTS "Users manage own family members" ON family_members;
DROP POLICY IF EXISTS "Users manage own family members" ON public.family_members;

CREATE POLICY "Users manage own family members" ON family_members
FOR ALL USING (
  family_id IN (SELECT id FROM families WHERE user_id = auth.uid())
)
WITH CHECK (
  family_id IN (SELECT id FROM families WHERE user_id = auth.uid())
);
