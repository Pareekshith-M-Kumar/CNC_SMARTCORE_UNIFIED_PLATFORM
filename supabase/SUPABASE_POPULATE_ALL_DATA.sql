-- ============================================================================
-- CNC SmartCore: Complete Supabase Cloud Population & Showcase Script (Fixed)
-- Paste this script into Supabase SQL Editor and click "RUN" (▶)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. USER PROFILES & AUTOMATIC SIGNUP TRIGGER
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('designer', 'cam_engineer', 'approver', 'admin', 'operator', 'customer')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync all existing auth.users to public.profiles
INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    COALESCE(raw_user_meta_data->>'role', 'admin'),
    true
FROM auth.users
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role);

-- Create automatic signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin'),
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = CASE WHEN EXCLUDED.full_name <> '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
        role = CASE WHEN EXCLUDED.role <> '' THEN EXCLUDED.role ELSE public.profiles.role END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS and grant read/write access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS profiles_insert_all ON public.profiles;
CREATE POLICY profiles_insert_all ON public.profiles FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS profiles_update_all ON public.profiles;
CREATE POLICY profiles_update_all ON public.profiles FOR UPDATE USING (true);

GRANT ALL ON TABLE public.profiles TO authenticated, anon, postgres;

-- ----------------------------------------------------------------------------
-- 1. SEED MATERIALS CATALOG
-- ----------------------------------------------------------------------------
INSERT INTO public.materials (
    id, code, name, category, density_kg_m3, kc_n_mm2, 
    vc_min_m_min, vc_max_m_min, fz_factor, strength_rating, 
    lightness_rating, corrosion_rating, machinability_rating, 
    cost_level, cost_per_kg, suitable_applications, notes, is_sample_data, is_active
)
VALUES 
    ('11111111-1111-1111-1111-111111111101', 'AL6061-T6', 'Aluminium 6061-T6', 'ALUMINIUM', 2700, 700, 200, 300, 0.003, 3, 4, 4, 5, 2, 350.00, 'structural_bracket,housing,fixture,prototype', 'Standard aerospace & prototyping aluminum. Excellent machinability.', true, true),
    ('11111111-1111-1111-1111-111111111102', 'STEEL-1018', 'Mild Steel AISI 1018', 'STEEL', 7850, 1500, 90, 140, 0.002, 4, 2, 2, 3, 1, 120.00, 'structural_bracket,shaft,weldment,fixture', 'General purpose low-carbon mild steel. Economical baseline.', true, true),
    ('11111111-1111-1111-1111-111111111103', 'SS-304', 'Stainless Steel 304', 'STAINLESS', 8000, 2100, 60, 100, 0.0015, 4, 2, 5, 2, 4, 550.00, 'food_grade,chemical,marine,housing', 'Corrosion resistant austenitic stainless steel. High work hardening.', true, true),
    ('11111111-1111-1111-1111-111111111104', 'DELRIN', 'Acetal / Delrin (POM)', 'PLASTIC', 1410, 350, 150, 400, 0.004, 2, 5, 5, 5, 3, 450.00, 'gears,bushings,insulators,prototypes', 'High precision engineering thermoplastic with zero tool wear.', true, true),
    ('11111111-1111-1111-1111-111111111105', 'BRASS-360', 'Free-Cutting Brass C360', 'BRASS', 8500, 800, 120, 250, 0.003, 3, 2, 4, 5, 3, 600.00, 'fittings,valves,bearings,decorative', 'Highest machinability standard (100% baseline). Superior finish.', true, true),
    ('11111111-1111-1111-1111-111111111106', 'TITANIUM-GR5', 'Titanium Grade 5 (Ti-6Al-4V)', 'TITANIUM', 4430, 2800, 30, 60, 0.001, 5, 4, 5, 1, 5, 2500.00, 'aerospace,medical_implants,marine_hardware', 'Extreme strength-to-weight ratio. Demands low cutting speed and flood coolant.', true, true)
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, cost_per_kg = EXCLUDED.cost_per_kg;

-- ----------------------------------------------------------------------------
-- 2. SEED MACHINE PROFILES
-- ----------------------------------------------------------------------------
INSERT INTO public.machine_profiles (
    id, name, controller_dialect, travel_x_mm, travel_y_mm, travel_z_mm, 
    max_rpm, rated_power_kw, spindle_efficiency, rapid_feed_mm_min, 
    max_feed_mm_min, tool_change_s, machine_rate_per_hr, idle_power_kw, is_sample_data, is_active
)
VALUES
    ('22222222-2222-2222-2222-222222222201', 'Haas VF-2 (3-Axis VMC)', 'GENERIC_ISO', 762.0, 406.0, 508.0, 8100, 22.4, 0.85, 25400.0, 16500.0, 4.2, 850.0, 1.2, true, true),
    ('22222222-2222-2222-2222-222222222202', 'DMG MORI DMU 50 (5-Axis)', 'GENERIC_ISO', 500.0, 450.0, 400.0, 15000, 14.5, 0.88, 30000.0, 20000.0, 5.0, 1400.0, 1.5, true, true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. SEED CUTTING TOOLS (Matches consolidated_schema.sql column names)
-- ----------------------------------------------------------------------------
INSERT INTO public.cutting_tools (
    id, designation, tool_type, diameter_mm, flutes, flute_length_mm, 
    overall_length_mm, material, is_center_cutting, cost, life_expectancy_min, is_sample_data, is_active
)
VALUES
    ('33333333-3333-3333-3333-333333333301', '10mm Flat End Mill (Carbide)', 'FLAT_END_MILL', 10.0, 4, 25.0, 75.0, 'CARBIDE', true, 1800.0, 150.0, true, true),
    ('33333333-3333-3333-3333-333333333302', '6mm Flat End Mill (Carbide)', 'FLAT_END_MILL', 6.0, 3, 18.0, 60.0, 'CARBIDE', true, 1200.0, 120.0, true, true),
    ('33333333-3333-3333-3333-333333333303', '50mm Face Mill (Indexable)', 'FACE_MILL', 50.0, 4, 12.0, 50.0, 'CARBIDE', false, 4500.0, 240.0, true, true)
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. CREATE CORE & M1 SCHEMAS
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS m1;

CREATE TABLE IF NOT EXISTS core.manufacturing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT UNIQUE NOT NULL,
  plan_hash CHAR(64) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'CREATED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_no TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES core.manufacturing_orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DELIVERED',
  carrier_label TEXT NOT NULL DEFAULT 'FastFreight Express',
  tracking_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES core.manufacturing_orders(id) ON DELETE RESTRICT,
  serial_no TEXT,
  status TEXT NOT NULL DEFAULT 'VERIFIED',
  machine_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS m1.machines (
    id SERIAL PRIMARY KEY,
    machine_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'RUNNING',
    location VARCHAR(100),
    asset_id VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS m1.machine_metrics (
    id BIGSERIAL PRIMARY KEY,
    machine_id INT REFERENCES m1.machines(id) ON DELETE CASCADE,
    spindle_speed DOUBLE PRECISION,
    feed_rate DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    vibration DOUBLE PRECISION,
    tool_wear DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Core Orders & Assets
INSERT INTO core.manufacturing_orders (id, order_no, plan_hash, quantity, status)
VALUES 
    ('77777777-7777-7777-7777-777777777701', 'MO-2026-1001', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 2, 'IN_PRODUCTION'),
    ('77777777-7777-7777-7777-777777777702', 'MO-2026-1000', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 1, 'DELIVERED')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.assets (id, asset_tag, order_id, serial_no, status, machine_code)
VALUES 
    ('88888888-8888-8888-8888-888888888803', 'ASSET-000120', '77777777-7777-7777-7777-777777777702', 'SN-CNC-PRO-0120', 'VERIFIED', 'CNC-002'),
    ('88888888-8888-8888-8888-888888888801', 'ASSET-000123', '77777777-7777-7777-7777-777777777701', 'SN-CNC-PRO-0123', 'IN_SHIPMENT', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO m1.machines (id, machine_code, name, status, location, asset_id)
VALUES 
    (1, 'CNC-001', 'Haas VF-2 (3-Axis VMC)', 'RUNNING', 'Shop Floor Bay 1', 'ASSET-000123'),
    (2, 'CNC-002', 'DMG MORI DMU 50 (5-Axis)', 'READY', 'Precision Cell Bay 4', 'ASSET-000120')
ON CONFLICT (id) DO NOTHING;

INSERT INTO m1.machine_metrics (machine_id, spindle_speed, feed_rate, temperature, vibration, tool_wear)
VALUES 
    (1, 4500.0, 850.0, 42.5, 1.24, 0.18),
    (1, 4500.0, 850.0, 43.1, 1.29, 0.19),
    (1, 6000.0, 600.0, 48.8, 1.85, 0.24);

-- ----------------------------------------------------------------------------
-- 5. EXPOSE EVERYTHING TO SCHEMA PUBLIC FOR 1-CLICK REVIEW
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.physical_assets AS 
  SELECT a.id, a.asset_tag, o.order_no, a.serial_no, a.status, a.machine_code, o.plan_hash, a.created_at
  FROM core.assets a
  JOIN core.manufacturing_orders o ON a.order_id = o.id;

CREATE OR REPLACE VIEW public.manufacturing_orders AS SELECT * FROM core.manufacturing_orders;
CREATE OR REPLACE VIEW public.shipments AS SELECT * FROM core.shipments;
CREATE OR REPLACE VIEW public.machines AS SELECT * FROM m1.machines;
CREATE OR REPLACE VIEW public.machine_metrics AS SELECT * FROM m1.machine_metrics;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon, postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA core TO authenticated, anon, postgres;
GRANT SELECT ON ALL TABLES IN SCHEMA m1 TO authenticated, anon, postgres;
