-- Ensure space creators are always listed as admin
-- 1. Add created_by to spaces so we know who created each space
-- 2. Trigger: when a space is inserted with created_by, add that user as admin
-- 3. Backfill existing spaces and fix admin roles

-- Add created_by (nullable for existing rows)
ALTER TABLE spaces
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Trigger function: add creator as admin membership when a space is created
CREATE OR REPLACE FUNCTION public.set_space_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO space_memberships (user_id, space_id, role)
    VALUES (NEW.created_by, NEW.id, 'admin')
    ON CONFLICT (user_id, space_id)
    DO UPDATE SET role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_space_creator_as_admin_trigger ON spaces;
CREATE TRIGGER set_space_creator_as_admin_trigger
  AFTER INSERT ON spaces
  FOR EACH ROW
  EXECUTE FUNCTION public.set_space_creator_as_admin();

-- Backfill: for spaces without created_by, set created_by to the first member (earliest joined_at)
UPDATE spaces s
SET created_by = sub.user_id
FROM (
  SELECT DISTINCT ON (space_id) space_id, user_id
  FROM space_memberships
  ORDER BY space_id, joined_at ASC
) sub
WHERE s.id = sub.space_id
  AND s.created_by IS NULL;

-- Ensure those backfilled creators have role = 'admin'
UPDATE space_memberships sm
SET role = 'admin'
FROM spaces s
WHERE s.id = sm.space_id
  AND s.created_by = sm.user_id
  AND sm.role <> 'admin';
