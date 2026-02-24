-- Performance indexes for frequently filtered columns
-- These speed up all queries that filter by user_id or family_id

CREATE INDEX IF NOT EXISTS idx_meal_history_user_created
  ON meal_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_families_user_id
  ON families(user_id);

CREATE INDEX IF NOT EXISTS idx_family_members_family_id
  ON family_members(family_id);
