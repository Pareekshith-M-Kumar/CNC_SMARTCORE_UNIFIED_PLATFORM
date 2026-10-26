-- CNC SmartCore Unified Platform
-- Migration: 20261025000013_link_asset_machine.sql
-- Purpose: Add asset_id foreign key linking m1.machines to core.assets (enforcing 1:1 link)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'm1' AND table_name = 'machines' AND column_name = 'asset_id'
  ) THEN
    ALTER TABLE m1.machines
      ADD COLUMN asset_id UUID UNIQUE REFERENCES core.assets(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_m1_machines_asset_id ON m1.machines(asset_id);
  END IF;
END $$;
