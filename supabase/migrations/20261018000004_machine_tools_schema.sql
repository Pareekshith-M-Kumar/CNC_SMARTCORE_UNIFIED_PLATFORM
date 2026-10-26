-- CNC SmartCore Module 2: Machine Profiles and Cutting Tools Library
-- Migration: 20261018000004_machine_tools_schema.sql

-- Machine Profiles Table
CREATE TABLE IF NOT EXISTS public.machine_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    controller_dialect TEXT NOT NULL DEFAULT 'GENERIC_ISO' CHECK (controller_dialect IN ('GENERIC_ISO', 'FANUC', 'HAAS', 'SIEMENS')),
    travel_x_mm NUMERIC NOT NULL,
    travel_y_mm NUMERIC NOT NULL,
    travel_z_mm NUMERIC NOT NULL,
    max_rpm INT NOT NULL CHECK (max_rpm > 0),
    rated_power_kw NUMERIC NOT NULL CHECK (rated_power_kw > 0),
    spindle_efficiency NUMERIC NOT NULL DEFAULT 0.8 CHECK (spindle_efficiency > 0 AND spindle_efficiency <= 1.0),
    rapid_feed_mm_min NUMERIC NOT NULL CHECK (rapid_feed_mm_min > 0),
    max_feed_mm_min NUMERIC NOT NULL CHECK (max_feed_mm_min > 0),
    tool_change_s NUMERIC NOT NULL DEFAULT 5.0 CHECK (tool_change_s >= 0),
    machine_rate_per_hr NUMERIC NOT NULL DEFAULT 500.0 CHECK (machine_rate_per_hr >= 0),
    idle_power_kw NUMERIC NOT NULL DEFAULT 0.5 CHECK (idle_power_kw >= 0),
    is_sample_data BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cutting Tools Table
CREATE TABLE IF NOT EXISTS public.cutting_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    tool_type TEXT NOT NULL CHECK (tool_type IN ('FLAT_END_MILL', 'BALL_END_MILL', 'FACE_MILL', 'DRILL')),
    diameter_mm NUMERIC NOT NULL CHECK (diameter_mm > 0),
    flute_count INT NOT NULL CHECK (flute_count > 0),
    flute_length_mm NUMERIC NOT NULL CHECK (flute_length_mm > 0),
    overall_length_mm NUMERIC NOT NULL CHECK (overall_length_mm > 0),
    tool_material TEXT NOT NULL CHECK (tool_material IN ('HSS', 'CARBIDE')),
    center_cutting BOOLEAN NOT NULL DEFAULT true,
    price NUMERIC NOT NULL DEFAULT 1000.0 CHECK (price >= 0),
    expected_life_min INT NOT NULL DEFAULT 120 CHECK (expected_life_min > 0),
    is_sample_data BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.machine_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cutting_tools ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.machine_profiles FROM anon;
REVOKE ALL ON TABLE public.cutting_tools FROM anon;
GRANT SELECT ON TABLE public.machine_profiles TO authenticated;
GRANT SELECT ON TABLE public.cutting_tools TO authenticated;
GRANT ALL ON TABLE public.machine_profiles TO app_backend;
GRANT ALL ON TABLE public.cutting_tools TO app_backend;

-- Policies for machine_profiles
DROP POLICY IF EXISTS machine_profiles_backend_all ON public.machine_profiles;
CREATE POLICY machine_profiles_backend_all ON public.machine_profiles
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS machine_profiles_select ON public.machine_profiles;
CREATE POLICY machine_profiles_select ON public.machine_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Policies for cutting_tools
DROP POLICY IF EXISTS cutting_tools_backend_all ON public.cutting_tools;
CREATE POLICY cutting_tools_backend_all ON public.cutting_tools
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cutting_tools_select ON public.cutting_tools;
CREATE POLICY cutting_tools_select ON public.cutting_tools
  FOR SELECT TO authenticated
  USING (true);
