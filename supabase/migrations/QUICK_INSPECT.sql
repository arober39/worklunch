-- Quick inspection queries - run these one at a time in Supabase SQL Editor

-- 1. See all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 2. See all custom types/enums
SELECT t.typname AS type_name, 
       string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND t.typtype = 'e'
GROUP BY t.typname
ORDER BY t.typname;

-- 3. See all functions
SELECT proname AS function_name 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY proname;

-- 4. See all triggers
SELECT trigger_name, event_object_table AS table_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 5. See storage buckets
SELECT id, name, public FROM storage.buckets ORDER BY name;
