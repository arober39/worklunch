-- Fix infinite recursion in space_memberships RLS policies
-- Policies that referenced space_memberships inside their own USING/WITH CHECK
-- caused recursion. Replace with non-recursive policies.

-- Drop old (recursive) and any existing new policies so this migration is idempotent
DROP POLICY IF EXISTS "Users can view memberships in their spaces" ON space_memberships;
DROP POLICY IF EXISTS "Users can view own memberships" ON space_memberships;
DROP POLICY IF EXISTS "Space admins can update memberships" ON space_memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON space_memberships;

-- SELECT: users can only read their own membership rows (no self-reference)
CREATE POLICY "Users can view own memberships"
  ON space_memberships FOR SELECT
  USING (user_id = auth.uid());

-- UPDATE: users can only update their own membership row (e.g. department, floor, desk)
CREATE POLICY "Users can update own membership"
  ON space_memberships FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
