-- CNC SmartCore Module 2: RLS and Constraint Verification Tests
-- File: supabase/tests/rls_test.sql
-- Run in Supabase SQL editor or psql to verify schema integrity and security rules

-- 1. Security Gate: Verify all public tables have Row Level Security enabled
DO $$
DECLARE
  unsecured_tables TEXT;
BEGIN
  SELECT string_agg(tablename, ', ')
  INTO unsecured_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND NOT rowsecurity;

  IF unsecured_tables IS NOT NULL THEN
    RAISE EXCEPTION 'RLS is not enabled on public tables: %', unsecured_tables;
  ELSE
    RAISE NOTICE 'SUCCESS: All public tables have RLS enabled.';
  END IF;
END $$;

-- 2. Verify separation of duties check constraint exists on manufacturing_approvals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'manufacturing_approvals'
      AND constraint_name = 'chk_separation_of_duties'
  ) THEN
    RAISE EXCEPTION 'FAILED: Separation of duties constraint missing on manufacturing_approvals.';
  ELSE
    RAISE NOTICE 'SUCCESS: Separation of duties constraint verified.';
  END IF;
END $$;

-- 3. Verify plan hash check constraint exists on manufacturing_approvals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'manufacturing_approvals'
      AND constraint_name = 'chk_approved_plan_hash'
  ) THEN
    RAISE EXCEPTION 'FAILED: Approved plan hash constraint missing on manufacturing_approvals.';
  ELSE
    RAISE NOTICE 'SUCCESS: Approved plan hash constraint verified.';
  END IF;
END $$;

-- 4. Verify audit_events table is append-only (has no UPDATE or DELETE privilege for anon/authenticated)
DO $$
DECLARE
  has_dangerous_privs BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_name = 'audit_events'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type IN ('UPDATE', 'DELETE', 'TRUNCATE')
  ) INTO has_dangerous_privs;

  IF has_dangerous_privs THEN
    RAISE EXCEPTION 'FAILED: Dangerous write privileges detected on audit_events for public/anon/authenticated roles!';
  ELSE
    RAISE NOTICE 'SUCCESS: audit_events append-only immutability verified.';
  END IF;
END $$;
