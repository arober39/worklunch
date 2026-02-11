-- RPC so the app can delete a space with an explicit admin check (avoids RLS/session quirks).
-- Admin is determined by space_memberships.role = 'admin' for the current user.

CREATE OR REPLACE FUNCTION public.delete_space(space_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM space_memberships
    WHERE space_memberships.space_id = delete_space.space_id
      AND user_id = auth.uid()
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not an admin of this space. Only space admins can delete the community.'
      USING errcode = 'P0001';
  END IF;
  DELETE FROM spaces WHERE id = delete_space.space_id;
END;
$$;

-- Allow authenticated users to call it (function itself checks admin)
GRANT EXECUTE ON FUNCTION public.delete_space(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_space(uuid) TO service_role;
