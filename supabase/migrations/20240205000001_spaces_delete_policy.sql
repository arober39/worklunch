-- Allow space admins to delete their space (was missing; RLS blocked delete)
-- Drop first so this is safe to run even if the policy already exists
DROP POLICY IF EXISTS "Space admins can delete spaces" ON spaces;

CREATE POLICY "Space admins can delete spaces"
  ON spaces FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM space_memberships
      WHERE space_id = spaces.id
      AND user_id = auth.uid()
      AND role = 'admin'
    )
  );
