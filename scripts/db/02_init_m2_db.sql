-- ============================================================================
-- DATABASE 2: cnc_m2_db (Pre-Manufacturing Platform Database)
-- Dedicated to Module 2: CAD Assets, Materials Catalog, CAM Jobs, Toolpaths, Approvals
-- ============================================================================

CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- Aluminum, Steel, Titanium, Polymer
    density_g_cm3 DOUBLE PRECISION NOT NULL,
    yield_strength_mpa DOUBLE PRECISION NOT NULL,
    hardness_hb DOUBLE PRECISION,
    machinability_rating DOUBLE PRECISION NOT NULL, -- 0.0 - 1.0 scale
    cost_per_kg_inr DOUBLE PRECISION NOT NULL,
    thermal_conductivity DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cad_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_name VARCHAR(150) NOT NULL,
    description TEXT,
    created_by UUID,
    department VARCHAR(100) DEFAULT 'Engineering',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cad_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cad_asset_id UUID REFERENCES cad_assets(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    file_format VARCHAR(20) NOT NULL, -- STEP, STL, GLB
    storage_path VARCHAR(255) NOT NULL,
    original_file_hash VARCHAR(64) NOT NULL, -- SHA-256
    file_size_bytes BIGINT NOT NULL,
    bounding_box_x DOUBLE PRECISION,
    bounding_box_y DOUBLE PRECISION,
    bounding_box_z DOUBLE PRECISION,
    volume_cm3 DOUBLE PRECISION,
    surface_area_cm2 DOUBLE PRECISION,
    status VARCHAR(30) DEFAULT 'ANALYZED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cam_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cad_version_id UUID REFERENCES cad_versions(id) ON DELETE CASCADE,
    material_id UUID REFERENCES materials(id),
    operation_type VARCHAR(50) DEFAULT '3_AXIS_MILLING',
    spindle_speed_rpm INT NOT NULL,
    feed_rate_mm_min DOUBLE PRECISION NOT NULL,
    plunge_rate_mm_min DOUBLE PRECISION NOT NULL,
    depth_of_cut_mm DOUBLE PRECISION NOT NULL,
    tool_diameter_mm DOUBLE PRECISION NOT NULL,
    toolpath_storage_path VARCHAR(255),
    gcode_hash VARCHAR(64), -- SHA-256 of generated NC program
    estimated_cycle_time_seconds INT,
    status VARCHAR(30) DEFAULT 'GENERATED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approval_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cam_job_id UUID REFERENCES cam_jobs(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL,
    status VARCHAR(30) NOT NULL, -- APPROVED, REJECTED
    plan_hash VARCHAR(64) NOT NULL, -- SHA-256 Provenance Fingerprint
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed materials catalog
INSERT INTO materials (code, name, category, density_g_cm3, yield_strength_mpa, machinability_rating, cost_per_kg_inr)
VALUES 
    ('AL-6061', 'Aluminum 6061-T6', 'Aluminum', 2.70, 276.0, 0.90, 450.0),
    ('AL-7075', 'Aluminum 7075-T6', 'Aluminum', 2.81, 503.0, 0.70, 750.0),
    ('SS-304', 'Stainless Steel 304', 'Steel', 8.00, 215.0, 0.45, 620.0),
    ('SS-316L', 'Stainless Steel 316L', 'Steel', 8.00, 290.0, 0.40, 850.0),
    ('TI-GR5', 'Titanium Grade 5 (Ti-6Al-4V)', 'Titanium', 4.43, 880.0, 0.22, 3800.0),
    ('POM-C', 'Acetal / Delrin (POM-C)', 'Polymer', 1.41, 65.0, 1.00, 320.0)
ON CONFLICT (code) DO NOTHING;
