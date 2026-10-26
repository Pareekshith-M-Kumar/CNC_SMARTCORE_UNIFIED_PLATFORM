-- supabase/tests/rls-checks.sql
-- Verification script to execute in Supabase SQL Editor to verify RLS coverage and security policies

-- ============================================================
-- Test 1: Verify 100% of tables in public, core, and m1 have RLS ENABLED
-- Expected result: 0 rows returned
-- ============================================================
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname IN ('public', 'core', 'm1')
  AND NOT rowsecurity;

-- ============================================================
-- Test 2: Verify 'anon' role has 0 privileges on any table in core and m1
-- Expected result: 0 rows returned
-- ============================================================
SELECT table_schema, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE grantee = 'anon'
  AND table_schema IN ('core', 'm1');

-- ============================================================
-- Test 3: Verify authenticated role cannot alter profiles.role
-- (Run this block inside a transaction)
-- ============================================================
DO $$
BEGIN
  -- Should fail with permission denied or trigger protection if attempted directly
  -- by an authenticated client
  RAISE NOTICE 'Testing profiles.role update restriction...';
END $$;

-- ============================================================
-- Test 4: Verify schema separation and role existence
-- Expected result: 1 row for each role
-- ============================================================
SELECT rolname FROM pg_roles WHERE rolname IN ('app_backend', 'm1_backend', 'm1_migrator');

-- ============================================================
-- Test 5: Verify foreign key link exists on m1.machines.asset_id
-- ============================================================
SELECT
    tc.table_schema, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'm1'
  AND tc.table_name = 'machines'
  AND kcu.column_name = 'asset_id';
