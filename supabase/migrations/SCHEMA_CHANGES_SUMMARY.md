# Lunch Swapping Schema - Changes Summary

## ✅ All Changes Are Already in the Migration Files

The SQL migration files have been updated with all the lunch swapping schema changes. Here's what's included:

## Migration Files (Run in Order)

1. **`20231231000000_cleanup_existing_schema.sql`** (Optional - only if you have old schema)
   - Drops all existing tables, types, functions, and triggers

2. **`20240101000000_initial_schema.sql`** ✅ **CONTAINS LUNCH SWAPPING SCHEMA**
   - Creates all tables with lunch swapping structure
   - See details below

3. **`20240101000001_rls_policies.sql`** ✅ **UPDATED FOR LUNCH SWAPPING**
   - Row Level Security policies for lunch swapping context

4. **`20240101000002_storage_setup.sql`** ✅ **READY**
   - Storage bucket for lunch photos

## Schema Changes Confirmed in SQL

### ✅ 1. Post Categories (Lines 8-18)
```sql
CREATE TYPE post_category AS ENUM (
  'sandwich',
  'salad',
  'pasta',
  'soup',
  'pizza',
  'asian',
  'mexican',
  'mediterranean',
  'other'
);
```

### ✅ 2. User Role (Lines 39-42)
```sql
CREATE TYPE user_role AS ENUM (
  'employee',  -- Changed from 'resident'
  'admin'
);
```

### ✅ 3. Profiles Table (Lines 46-54)
- ✅ Added `dietary_preferences TEXT`
- ✅ Added `allergies TEXT`

### ✅ 4. Spaces Table (Lines 56-68)
- ✅ Comments updated: "Represents companies/offices where employees work"
- ✅ Fields kept: `name`, `address`, `city`, `state`, `zip`, `join_code`, `photo_url`

### ✅ 5. Space Memberships Table (Lines 70-82)
- ✅ Removed: `apartment_number`
- ✅ Added: `department TEXT`, `floor TEXT`, `desk_number TEXT` (all nullable)
- ✅ Changed default role: `'employee'` (was `'resident'`)

### ✅ 6. Posts Table (Lines 84-98)
- ✅ Comments updated: "Lunches that employees are offering to swap"
- ✅ Added: `dietary_info TEXT` (nullable)
- ✅ Added: `expires_at TIMESTAMPTZ` (nullable)
- ✅ Category uses new meal types enum

### ✅ 7. Trades Table (Lines 152-162)
- ✅ Removed: `seller_id`, `buyer_id`
- ✅ Added: `lunch_owner_id`, `lunch_swapper_id`
- ✅ Comments updated: "Completed lunch swaps"
- ✅ CHECK constraint updated to use new field names

### ✅ 8. Indexes (Lines 164-178)
- ✅ Updated to use `lunch_owner_id` and `lunch_swapper_id`
- ✅ Added index for `expires_at` on posts

### ✅ 9. Functions & Triggers
- ✅ Profile creation function includes dietary preferences and allergies
- ✅ All comments updated for lunch swapping context

## How to Apply

1. **If you have existing schema:**
   - Run `20231231000000_cleanup_existing_schema.sql` first
   - Delete storage bucket manually if it exists

2. **Run the new schema:**
   - Run `20240101000000_initial_schema.sql`
   - Run `20240101000001_rls_policies.sql`
   - Run `20240101000002_storage_setup.sql`

## Verification

After running migrations, verify with:
```sql
-- Check tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check post categories
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) 
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'post_category'
GROUP BY t.typname;

-- Check space_memberships columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'space_memberships' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check trades columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trades' AND table_schema = 'public'
ORDER BY ordinal_position;
```

## All Changes Are Complete! ✅

The SQL files are ready to use. Just run them in order in your Supabase SQL Editor.
