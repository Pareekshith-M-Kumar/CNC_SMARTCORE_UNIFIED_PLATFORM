-- CNC SmartCore Unified Platform
-- Migration: 20261025000010_expand_roles_operator_customer.sql
-- Purpose: Expand profiles.role CHECK constraint to add 'operator' and 'customer' roles

DO $$
BEGIN
  -- Drop existing check constraint on profiles.role
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

  -- Re-add check constraint including operator and customer
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('designer', 'cam_engineer', 'approver', 'operator', 'customer', 'admin'));
END $$;
