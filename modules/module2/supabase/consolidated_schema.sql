-- ==============================================================================
-- CNC SmartCore Module 2: Consolidated Production Database Schema for Supabase
-- Target Project: https://tlqdmyzpooiadaqnzowc.supabase.co
-- Run this script in the Supabase Dashboard SQL Editor to initialize all tables & seeds.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. SCHEMAS
CREATE SCHEMA IF NOT EXISTS private;

-- 3. PROFILES TABLE (Mirrors auth.users with RBAC role attributes)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'designer' CHECK (role IN ('designer', 'cam_engineer', 'approver', 'admin')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Insert fallback default system user
INSERT INTO public.profiles (id, email, full_name, role, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'system@cncsmartcore.internal', 'CNC SmartCore System', 'admin', true)
ON CONFLICT (id) DO NOTHING;

-- 4. MATERIALS CATALOG
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('ALUMINIUM', 'STEEL', 'STAINLESS', 'TITANIUM', 'BRASS', 'COPPER', 'PLASTIC', 'COMPOSITE', 'OTHER')),
    density_kg_m3 NUMERIC NOT NULL CHECK (density_kg_m3 > 0),
    kc_n_mm2 NUMERIC NOT NULL CHECK (kc_n_mm2 > 0),
    vc_min_m_min NUMERIC NOT NULL CHECK (vc_min_m_min > 0),
    vc_max_m_min NUMERIC NOT NULL CHECK (vc_max_m_min >= vc_min_m_min),
    fz_factor NUMERIC NOT NULL DEFAULT 0.003,
    strength_rating INT NOT NULL CHECK (strength_rating BETWEEN 1 AND 5),
    lightness_rating INT NOT NULL CHECK (lightness_rating BETWEEN 1 AND 5),
    corrosion_rating INT NOT NULL CHECK (corrosion_rating BETWEEN 1 AND 5),
    machinability_rating INT NOT NULL CHECK (machinability_rating BETWEEN 1 AND 5),
    cost_level INT NOT NULL CHECK (cost_level BETWEEN 1 AND 5),
    cost_per_kg NUMERIC NOT NULL DEFAULT 0.0,
    suitable_applications TEXT,
    notes TEXT,
    is_sample_data BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_materials_category ON public.materials(category);

-- 5. MACHINE PROFILES
CREATE TABLE IF NOT EXISTS public.machine_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    controller_dialect TEXT NOT NULL CHECK (controller_dialect IN ('GENERIC_ISO', 'HAAS_NGC', 'SIEMENS_840D', 'HEIDENHAIN', 'FANUC')),
    travel_x_mm NUMERIC NOT NULL CHECK (travel_x_mm > 0),
    travel_y_mm NUMERIC NOT NULL CHECK (travel_y_mm > 0),
    travel_z_mm NUMERIC NOT NULL CHECK (travel_z_mm > 0),
    max_rpm INT NOT NULL CHECK (max_rpm > 0),
    rated_power_kw NUMERIC NOT NULL CHECK (rated_power_kw > 0),
    spindle_efficiency NUMERIC NOT NULL DEFAULT 0.85,
    rapid_feed_mm_min NUMERIC NOT NULL CHECK (rapid_feed_mm_min > 0),
    max_feed_mm_min NUMERIC NOT NULL CHECK (max_feed_mm_min > 0),
    tool_change_s NUMERIC NOT NULL DEFAULT 4.0,
    machine_rate_per_hr NUMERIC NOT NULL DEFAULT 0.0,
    idle_power_kw NUMERIC NOT NULL DEFAULT 1.0,
    is_sample_data BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CUTTING TOOLS CATALOG
CREATE TABLE IF NOT EXISTS public.cutting_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designation TEXT NOT NULL,
    tool_type TEXT NOT NULL CHECK (tool_type IN ('FLAT_END_MILL', 'BALL_END_MILL', 'BULL_NOSE', 'FACE_MILL', 'DRILL', 'CHAMFER_MILL')),
    diameter_mm NUMERIC NOT NULL CHECK (diameter_mm > 0),
    flutes INT NOT NULL CHECK (flutes >= 1),
    flute_length_mm NUMERIC NOT NULL CHECK (flute_length_mm > 0),
    overall_length_mm NUMERIC NOT NULL CHECK (overall_length_mm >= flute_length_mm),
    material TEXT NOT NULL CHECK (material IN ('HSS', 'CARBIDE', 'COATED_CARBIDE', 'CERAMIC', 'CBN', 'PCD')),
    coating TEXT,
    is_center_cutting BOOLEAN NOT NULL DEFAULT true,
    cost NUMERIC NOT NULL DEFAULT 0.0,
    max_rpm INT,
    life_expectancy_min NUMERIC NOT NULL DEFAULT 120.0,
    is_sample_data BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. CAD ASSETS & VERSIONS
CREATE TABLE IF NOT EXISTS public.cad_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cad_assets_owner ON public.cad_assets(owner_id);

CREATE TABLE IF NOT EXISTS public.cad_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.cad_assets(id) ON DELETE RESTRICT,
    version_number INT NOT NULL,
    original_filename TEXT NOT NULL,
    file_format TEXT NOT NULL CHECK (file_format IN ('STL', 'STEP', 'IGES')),
    file_size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'cad-originals',
    storage_path TEXT NOT NULL,
    units TEXT NOT NULL DEFAULT 'mm' CHECK (units IN ('mm', 'in')),
    preview_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (preview_status IN ('PENDING', 'READY', 'FAILED', 'UNSUPPORTED')),
    preview_path TEXT,
    preview_error TEXT,
    processing_attempts INT NOT NULL DEFAULT 0,
    bbox_x_mm NUMERIC,
    bbox_y_mm NUMERIC,
    bbox_z_mm NUMERIC,
    volume_mm3 NUMERIC,
    surface_area_mm2 NUMERIC,
    triangle_count INT,
    is_watertight BOOLEAN,
    selected_material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cad_versions_asset_version UNIQUE (asset_id, version_number)
);
CREATE INDEX IF NOT EXISTS idx_cad_versions_asset ON public.cad_versions(asset_id);

-- 8. CAM JOBS & TOOLPATH OPERATIONS
CREATE TABLE IF NOT EXISTS public.cam_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cad_version_id UUID NOT NULL REFERENCES public.cad_versions(id) ON DELETE RESTRICT,
    material_id UUID REFERENCES public.materials(id) ON DELETE RESTRICT,
    machine_id UUID REFERENCES public.machine_profiles(id) ON DELETE RESTRICT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'CONFIGURED', 'CALCULATING', 'TOOLPATH_GENERATED', 'TOOLPATH_READY', 'TOOLPATH_FAILED', 'SUBMITTED', 'APPROVED', 'REJECTED')),
    stock_allowance_mm NUMERIC NOT NULL DEFAULT 2.0,
    stock_x_mm NUMERIC,
    stock_y_mm NUMERIC,
    stock_z_mm NUMERIC,
    setup_time_min NUMERIC NOT NULL DEFAULT 15.0,
    estimates JSONB,
    config_hash CHAR(64),
    generation_attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    row_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cam_jobs_cad_version ON public.cam_jobs(cad_version_id);
CREATE INDEX IF NOT EXISTS idx_cam_jobs_status ON public.cam_jobs(status);

CREATE TABLE IF NOT EXISTS public.toolpath_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cam_job_id UUID NOT NULL REFERENCES public.cam_jobs(id) ON DELETE CASCADE,
    seq INT NOT NULL,
    op_type TEXT NOT NULL CHECK (op_type IN ('FACING', 'FACE', 'POCKETING', 'ROUGH_POCKET', 'CONTOUR', 'DRILL', 'CHAMFER')),
    tool_id UUID NOT NULL REFERENCES public.cutting_tools(id) ON DELETE RESTRICT,
    spindle_rpm INT NOT NULL CHECK (spindle_rpm > 0),
    feed_mm_min NUMERIC NOT NULL CHECK (feed_mm_min > 0),
    plunge_feed_mm_min NUMERIC NOT NULL CHECK (plunge_feed_mm_min > 0),
    ap_mm NUMERIC NOT NULL CHECK (ap_mm > 0),
    ae_mm NUMERIC NOT NULL CHECK (ae_mm > 0),
    finish_allowance_mm NUMERIC NOT NULL DEFAULT 0.3,
    parameters_source TEXT NOT NULL DEFAULT 'CALCULATED',
    path_length_mm NUMERIC,
    cutting_length_mm NUMERIC,
    rapid_length_mm NUMERIC,
    move_count INT,
    est_time_s NUMERIC,
    est_power_kw NUMERIC,
    CONSTRAINT uq_toolpath_operations_job_seq UNIQUE (cam_job_id, seq)
);
CREATE INDEX IF NOT EXISTS idx_toolpath_operations_job ON public.toolpath_operations(cam_job_id);

-- 9. AUDIT EVENTS TABLE (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    ip_address TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON public.audit_events(timestamp DESC);

-- 10. SEED BASELINE DATA (Engineering Catalog)
-- Materials
INSERT INTO public.materials (
    id, code, name, category, density_kg_m3, kc_n_mm2,
    vc_min_m_min, vc_max_m_min, fz_factor,
    strength_rating, lightness_rating, corrosion_rating, machinability_rating,
    cost_level, cost_per_kg, suitable_applications, notes, is_sample_data, is_active
) VALUES
('11111111-1111-1111-1111-111111111101', 'AL6061-T6', 'Aluminium 6061-T6', 'ALUMINIUM', 2700, 700, 200, 300, 0.003, 3, 4, 4, 5, 2, 350.00, 'structural_bracket,housing,fixture', 'Standard aerospace & prototyping aluminum. Excellent machinability.', true, true),
('11111111-1111-1111-1111-111111111102', 'STEEL-1018', 'Mild Steel AISI 1018', 'STEEL', 7850, 1500, 90, 140, 0.002, 4, 2, 2, 3, 1, 120.00, 'structural_bracket,shaft,weldment', 'General purpose low-carbon mild steel.', true, true),
('11111111-1111-1111-1111-111111111103', 'SS-304', 'Stainless Steel 304', 'STAINLESS', 8000, 2100, 60, 100, 0.0015, 4, 2, 5, 2, 4, 550.00, 'food_grade,chemical,marine', 'Corrosion resistant austenitic stainless steel. High work hardening.', true, true),
('11111111-1111-1111-1111-111111111104', 'DELRIN', 'Acetal / Delrin (POM)', 'PLASTIC', 1410, 350, 250, 450, 0.004, 2, 5, 5, 5, 2, 420.00, 'insulator,bushing,prototype', 'Engineering thermoplastic with great dimensional stability.', true, true)
ON CONFLICT (id) DO NOTHING;

-- Machine Profiles
INSERT INTO public.machine_profiles (
    id, name, controller_dialect, travel_x_mm, travel_y_mm, travel_z_mm,
    max_rpm, rated_power_kw, spindle_efficiency, rapid_feed_mm_min, max_feed_mm_min,
    tool_change_s, machine_rate_per_hr, idle_power_kw, is_sample_data, is_active
) VALUES
('22222222-2222-2222-2222-222222222201', 'Haas VF-2 (3-Axis VMC)', 'GENERIC_ISO', 762, 406, 508, 12000, 22.4, 0.85, 25400, 16500, 4.2, 850.00, 1.2, true, true),
('22222222-2222-2222-2222-222222222202', 'DMG MORI DMU 50 (5-Axis)', 'GENERIC_ISO', 500, 450, 400, 20000, 14.5, 0.88, 30000, 20000, 5.0, 1400.00, 1.5, true, true)
ON CONFLICT (id) DO NOTHING;

-- Cutting Tools
INSERT INTO public.cutting_tools (
    id, designation, tool_type, diameter_mm, flutes, flute_length_mm, overall_length_mm,
    material, is_center_cutting, cost, max_rpm, life_expectancy_min, is_sample_data, is_active
) VALUES
('33333333-3333-3333-3333-333333333301', '10mm 3-Flute Carbide Flat End Mill', 'FLAT_END_MILL', 10.0, 3, 25.0, 75.0, 'CARBIDE', true, 1450.00, 18000, 120.0, true, true),
('33333333-3333-3333-3333-333333333302', '6mm 4-Flute Carbide Flat End Mill', 'FLAT_END_MILL', 6.0, 4, 18.0, 50.0, 'CARBIDE', true, 950.00, 24000, 90.0, true, true),
('33333333-3333-3333-3333-333333333303', '50mm 5-Insert Carbide Face Mill', 'FACE_MILL', 50.0, 5, 12.0, 100.0, 'CARBIDE', false, 4800.00, 8000, 240.0, true, true)
ON CONFLICT (id) DO NOTHING;

-- Standard Calibration Cube CAD Model
INSERT INTO public.cad_assets (id, owner_id, name, description)
VALUES ('11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001', 'Standard Calibration Cube (10mm)', 'Calibration fixture cube for machining verification')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cad_versions (
    id, asset_id, version_number, original_filename, file_format, file_size_bytes,
    sha256, storage_bucket, storage_path, units, preview_status,
    bbox_x_mm, bbox_y_mm, bbox_z_mm, volume_mm3, surface_area_mm2, triangle_count, is_watertight,
    selected_material_id, uploaded_by
) VALUES (
    '11111111-1111-1111-1111-111111111102',
    '11111111-1111-1111-1111-111111111101',
    1, 'cube_10mm.stl', 'STL', 1487,
    'a3b2c1d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
    'cad-originals', '11111111-1111-1111-1111-111111111101/11111111-1111-1111-1111-111111111102/cube_10mm.stl',
    'mm', 'READY',
    10.0, 10.0, 10.0, 1000.0, 600.0, 12, true,
    '11111111-1111-1111-1111-111111111101', '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- Default Pre-Simulated CAM Job
INSERT INTO public.cam_jobs (
    id, cad_version_id, material_id, machine_id, created_by, name, status,
    stock_allowance_mm, stock_x_mm, stock_y_mm, stock_z_mm, setup_time_min,
    estimates
) VALUES (
    '44444444-4444-4444-4444-444444444401',
    '11111111-1111-1111-1111-111111111102',
    '11111111-1111-1111-1111-111111111101',
    '22222222-2222-2222-2222-222222222201',
    '00000000-0000-0000-0000-000000000001',
    'CAM Job: Standard Calibration Cube (10mm) (v1)',
    'TOOLPATH_READY',
    2.0, 14.0, 14.0, 12.0, 15.0,
    '{"time":{"totalMachiningMin":0.44,"setupMin":15.0,"totalCycleMin":15.44},"cost":{"machine":0.0,"tooling":1.8,"setup":25.0,"energy":0.65,"total":31.7,"currency":"USD"}}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Operations for default CAM job
INSERT INTO public.toolpath_operations (
    id, cam_job_id, seq, op_type, tool_id, spindle_rpm, feed_mm_min, plunge_feed_mm_min,
    ap_mm, ae_mm, finish_allowance_mm, parameters_source, path_length_mm, cutting_length_mm, rapid_length_mm, move_count, est_time_s
) VALUES
('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444401', 1, 'FACING', '33333333-3333-3333-3333-333333333303', 2500, 1200.0, 360.0, 1.0, 35.0, 0.2, 'CATALOG_RECOMMENDED', 68.0, 52.0, 16.0, 8, 4.5),
('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444401', 2, 'POCKETING', '33333333-3333-3333-3333-333333333301', 4500, 850.0, 250.0, 2.0, 6.0, 0.3, 'CATALOG_RECOMMENDED', 145.0, 120.0, 25.0, 12, 12.8),
('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444401', 3, 'CONTOUR', '33333333-3333-3333-3333-333333333302', 6000, 600.0, 180.0, 1.0, 1.5, 0.0, 'CATALOG_RECOMMENDED', 88.0, 80.0, 8.0, 7, 9.2)
ON CONFLICT (id) DO NOTHING;
