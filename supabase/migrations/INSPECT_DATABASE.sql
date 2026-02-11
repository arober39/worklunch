-- Read-only queries to inspect your Supabase database
-- These queries will NOT modify anything - they only show what exists

-- ============================================
-- 1. LIST ALL TABLES
-- ============================================
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 2. LIST ALL CUSTOM TYPES/ENUMS
-- ============================================
SELECT 
  t.typname AS type_name,
  t.typtype AS type_type,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
FROM pg_type t
LEFT JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND t.typtype = 'e'  -- 'e' = enum type
GROUP BY t.typname, t.typtype
ORDER BY t.typname;

-- ============================================
-- 3. LIST ALL FUNCTIONS
-- ============================================
SELECT 
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ============================================
-- 4. LIST ALL TRIGGERS
-- ============================================
SELECT 
  trigger_schema,
  trigger_name,
  event_object_table AS table_name,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 5. LIST ALL INDEXES
-- ============================================
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 6. LIST ALL FOREIGN KEY CONSTRAINTS
-- ============================================
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 7. LIST ALL ROW LEVEL SECURITY POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 8. CHECK IF RLS IS ENABLED ON TABLES
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================
-- 9. LIST STORAGE BUCKETS (if you have access)
-- ============================================
-- Note: This requires access to the storage schema
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- ============================================
-- 10. SUMMARY: COUNT OF OBJECTS
-- ============================================
SELECT 
  'Tables' AS object_type,
  COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Enums' AS object_type,
  COUNT(DISTINCT t.typname) AS count
FROM pg_type t
WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND t.typtype = 'e'
UNION ALL
SELECT 
  'Functions' AS object_type,
  COUNT(*) AS count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
UNION ALL
SELECT 
  'Triggers' AS object_type,
  COUNT(*) AS count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
  'RLS Policies' AS object_type,
  COUNT(*) AS count
FROM pg_policies
WHERE schemaname = 'public';
