# How to Reset Your Supabase Database

If you've already run the old apartment trading schema and want to switch to the lunch swapping schema, follow these steps:

## Option 1: Using Supabase Dashboard (Recommended)

1. **Go to your Supabase project dashboard**
2. **Navigate to SQL Editor**
3. **Run the cleanup script first:**
   - Copy and paste the contents of `20231231000000_cleanup_existing_schema.sql`
   - Click "Run" to execute
   - This will drop all existing tables, types, functions, and triggers

4. **Then run the new schema migrations in order:**
   - `20240101000000_initial_schema.sql` (or the new lunch swapping version)
   - `20240101000001_rls_policies.sql`
   - `20240101000002_storage_setup.sql`

## Option 2: Manual Cleanup via Dashboard

If you prefer to use the Supabase dashboard UI:

1. **Delete Storage Bucket:**
   - Go to Storage → Buckets
   - Delete the `post-photos` bucket if it exists

2. **Delete Tables:**
   - Go to Table Editor
   - Delete tables in this order (to respect foreign key constraints):
     - trades
     - meetups
     - messages
     - conversations
     - proposals
     - posts
     - space_memberships
     - spaces
     - profiles

3. **Delete Functions:**
   - Go to Database → Functions
   - Delete all custom functions

4. **Delete Types:**
   - Go to Database → Types
   - Delete all custom enums

5. **Then run the new migrations**

## Option 3: Reset Entire Project (Nuclear Option)

If you want to start completely fresh:

1. **In Supabase Dashboard:**
   - Go to Project Settings → General
   - Scroll down and click "Delete Project"
   - Create a new project
   - Run all migrations from scratch

## Important Notes

- ⚠️ **Backup your data first** if you have any important data you want to keep
- The cleanup script will delete ALL data in these tables
- Storage bucket policies will be recreated when you run the storage setup migration
- Make sure to update your `.env` file with new credentials if you create a new project

## After Cleanup

Once cleanup is complete, run the migrations in this order:
1. `20240101000000_initial_schema.sql`
2. `20240101000001_rls_policies.sql`
3. `20240101000002_storage_setup.sql`
