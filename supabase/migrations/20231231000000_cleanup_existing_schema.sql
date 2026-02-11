-- Cleanup script to remove all existing resources
-- Run this BEFORE running the new schema migrations if you have existing data
-- WARNING: This will delete ALL data and schema objects!

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS meetups CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS space_memberships CASCADE;
DROP TABLE IF EXISTS spaces CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop all custom types/enums
DROP TYPE IF EXISTS post_category CASCADE;
DROP TYPE IF EXISTS post_status CASCADE;
DROP TYPE IF EXISTS proposal_status CASCADE;
DROP TYPE IF EXISTS meetup_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_join_code() CASCADE;
DROP FUNCTION IF EXISTS generate_space_join_code() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop all triggers (they should be dropped with functions, but just in case)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS generate_join_code_on_space_insert ON spaces CASCADE;
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals CASCADE;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations CASCADE;
DROP TRIGGER IF EXISTS update_meetups_updated_at ON meetups CASCADE;

-- Note: Storage buckets and policies will need to be deleted manually
-- or you can run the storage setup migration which uses ON CONFLICT DO NOTHING
