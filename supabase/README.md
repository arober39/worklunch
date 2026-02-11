# WorkLunch Database Migrations

This directory contains SQL migration files for setting up the WorkLunch Supabase database.

## Migration Files

1. **20240101000000_initial_schema.sql** - Creates all database tables, enums, indexes, and triggers
2. **20240101000001_rls_policies.sql** - Sets up Row Level Security (RLS) policies for all tables
3. **20240101000002_storage_setup.sql** - Creates the storage bucket and policies for post photos

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for initial setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order
4. Run each migration file

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 3: Manual Execution

1. Connect to your Supabase database
2. Run each SQL file in order:
   - `20240101000000_initial_schema.sql`
   - `20240101000001_rls_policies.sql`
   - `20240101000002_storage_setup.sql`

## Database Schema Overview

### Tables

- **profiles** - User profile information
- **spaces** - Companies/offices where employees work
- **space_memberships** - Links employees to companies/offices (with department/floor/desk info)
- **posts** - Lunches being offered for swap
- **proposals** - Lunch swap proposals on posts
- **conversations** - Chat conversations between employees
- **messages** - Individual messages in conversations
- **meetups** - Scheduled meetups for completing lunch swaps
- **trades** - Completed lunch swaps

### Key Features

- Automatic profile creation when users sign up
- Unique join codes for spaces
- Auto-updating timestamps
- Row Level Security (RLS) for data protection
- Storage bucket for post photos

## After Running Migrations

1. Verify all tables were created successfully
2. Check that RLS policies are enabled
3. Verify the `post-photos` storage bucket exists
4. Test creating a user profile (should happen automatically on signup)

## Notes

- All user IDs reference `auth.users` from Supabase Auth
- The `profiles` table is automatically populated via a trigger when users sign up
- Join codes for spaces are automatically generated to be unique
- All timestamps use `TIMESTAMPTZ` for timezone-aware dates
