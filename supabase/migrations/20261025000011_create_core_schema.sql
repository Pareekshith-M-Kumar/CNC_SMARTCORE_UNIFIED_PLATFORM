-- CNC SmartCore Unified Platform
-- Migration: 20261025000011_create_core_schema.sql
-- Purpose: Create 'core' schema and lifecycle bridge tables (orders, shipments, assets)

CREATE SCHEMA IF NOT EXISTS core;
REVOKE ALL ON SCHEMA core FROM public, anon;
GRANT USAGE ON SCHEMA core TO authenticated, app_backend;

CREATE SEQUENCE IF NOT EXISTS core.asset_seq START WITH 1000;
CREATE SEQUENCE IF NOT EXISTS core.order_seq START WITH 1000;
GRANT USAGE, SELECT ON SEQUENCE core.asset_seq, core.order_seq TO authenticated, app_backend;

-- 1. Manufacturing Orders
CREATE TABLE IF NOT EXISTS core.manufacturing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL
    DEFAULT ('MO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('core.order_seq')::text, 4, '0')),
  approval_id UUID NOT NULL REFERENCES public.manufacturing_approvals(id) ON DELETE RESTRICT,
  plan_hash CHAR(64) NOT NULL CHECK (plan_hash ~ '^[0-9a-f]{64}$'),
  quantity INT NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'CREATED'
    CHECK (status IN ('CREATED', 'IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Shipments (Demo logistics)
CREATE TABLE IF NOT EXISTS core.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_no TEXT UNIQUE NOT NULL,
  order_id UUID NOT NULL REFERENCES core.manufacturing_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PREPARING'
    CHECK (status IN ('PREPARING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'FAILED')),
  carrier_label TEXT NOT NULL DEFAULT 'DEMO-CARRIER',
  tracking_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Shipment Events
CREATE TABLE IF NOT EXISTS core.shipment_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES core.shipments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Serialized Physical Assets
CREATE TABLE IF NOT EXISTS core.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag TEXT UNIQUE NOT NULL
    DEFAULT ('ASSET-' || lpad(nextval('core.asset_seq')::text, 6, '0')),
  order_id UUID NOT NULL REFERENCES core.manufacturing_orders(id) ON DELETE RESTRICT,
  asset_kind TEXT NOT NULL DEFAULT 'cnc_machine'
    CHECK (asset_kind IN ('component', 'assembly', 'cnc_machine')),
  status TEXT NOT NULL DEFAULT 'MANUFACTURED'
    CHECK (status IN ('MANUFACTURED', 'IN_SHIPMENT', 'DELIVERED', 'REGISTERED', 'VERIFIED', 'RETIRED')),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  serial_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Asset Registrations
CREATE TABLE IF NOT EXISTS core.asset_registrations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES core.assets(id) ON DELETE CASCADE,
  registered_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  integrity_ok BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all core tables immediately upon creation (Rule 8)
ALTER TABLE core.manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.shipments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.shipment_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.assets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.asset_registrations ENABLE ROW LEVEL SECURITY;
