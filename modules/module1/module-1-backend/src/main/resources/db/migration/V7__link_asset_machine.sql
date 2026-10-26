-- ============================================================
-- V7__link_asset_machine.sql
-- CNC SmartCore Unified Platform: Add asset_id bridge to physical machines
-- ============================================================

ALTER TABLE machines
    ADD COLUMN IF NOT EXISTS asset_id UUID UNIQUE,
    ADD COLUMN IF NOT EXISTS asset_tag VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_machines_asset_id ON machines (asset_id);
CREATE INDEX IF NOT EXISTS idx_machines_asset_tag ON machines (asset_tag);
