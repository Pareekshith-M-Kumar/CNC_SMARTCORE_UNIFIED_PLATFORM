-- CNC SmartCore Module 2: CAM Jobs, Operations, and Toolpath Files
-- Migration: 20261018000005_cam_schema.sql

-- CAM Jobs Table
CREATE TABLE IF NOT EXISTS public.cam_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cad_version_id UUID NOT NULL REFERENCES public.cad_versions(id) ON DELETE RESTRICT,
    material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    machine_id UUID REFERENCES public.machine_profiles(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'CONFIGURED', 'TOOLPATH_GENERATING', 'TOOLPATH_READY',
      'TOOLPATH_FAILED', 'SIMULATED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'STALE'
    )),
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
CREATE INDEX IF NOT EXISTS idx_cam_jobs_created_by ON public.cam_jobs(created_by);

-- Toolpath Operations Table
CREATE TABLE IF NOT EXISTS public.toolpath_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cam_job_id UUID NOT NULL REFERENCES public.cam_jobs(id) ON DELETE CASCADE,
    seq INT NOT NULL,
    op_type TEXT NOT NULL CHECK (op_type IN ('FACE', 'ROUGH_POCKET', 'CONTOUR', 'DRILL')),
    tool_id UUID REFERENCES public.cutting_tools(id) ON DELETE SET NULL,
    spindle_rpm INT NOT NULL CHECK (spindle_rpm > 0),
    feed_mm_min NUMERIC NOT NULL CHECK (feed_mm_min > 0),
    plunge_feed_mm_min NUMERIC NOT NULL CHECK (plunge_feed_mm_min > 0),
    ap_mm NUMERIC NOT NULL CHECK (ap_mm > 0),
    ae_mm NUMERIC NOT NULL CHECK (ae_mm > 0),
    finish_allowance_mm NUMERIC NOT NULL DEFAULT 0.3,
    parameters_source TEXT NOT NULL DEFAULT 'CALCULATED' CHECK (parameters_source IN ('CALCULATED', 'EDITED')),
    path_length_mm NUMERIC,
    cutting_length_mm NUMERIC,
    rapid_length_mm NUMERIC,
    move_count INT,
    est_time_s NUMERIC,
    est_power_kw NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_toolpath_op_job_seq UNIQUE (cam_job_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_toolpath_ops_job ON public.toolpath_operations(cam_job_id);

-- Toolpath Files Table
CREATE TABLE IF NOT EXISTS public.toolpath_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cam_job_id UUID NOT NULL REFERENCES public.cam_jobs(id) ON DELETE CASCADE,
    generation_no INT NOT NULL DEFAULT 1,
    kind TEXT NOT NULL CHECK (kind IN ('TOOLPATH_JSON', 'GCODE')),
    storage_bucket TEXT NOT NULL DEFAULT 'toolpaths',
    storage_path TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    validation_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (validation_status IN ('PENDING', 'PASSED', 'FAILED')),
    validation_report JSONB,
    config_hash CHAR(64) NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_toolpath_files_job_current ON public.toolpath_files(cam_job_id, is_current);

-- Enable RLS
ALTER TABLE public.cam_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolpath_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolpath_files ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.cam_jobs FROM anon;
REVOKE ALL ON TABLE public.toolpath_operations FROM anon;
REVOKE ALL ON TABLE public.toolpath_files FROM anon;
GRANT SELECT ON TABLE public.cam_jobs TO authenticated;
GRANT ALL ON TABLE public.cam_jobs TO app_backend;
GRANT ALL ON TABLE public.toolpath_operations TO app_backend;
GRANT ALL ON TABLE public.toolpath_files TO app_backend;

-- Policies for cam_jobs
DROP POLICY IF EXISTS cam_jobs_backend_all ON public.cam_jobs;
CREATE POLICY cam_jobs_backend_all ON public.cam_jobs
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cam_jobs_select ON public.cam_jobs;
CREATE POLICY cam_jobs_select ON public.cam_jobs
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR (SELECT private.app_role()) IN ('cam_engineer', 'approver', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.cad_versions cv
      JOIN public.cad_assets ca ON cv.asset_id = ca.id
      WHERE cv.id = cam_jobs.cad_version_id
        AND ca.owner_id = (SELECT auth.uid())
    )
  );

-- Backend-only access for toolpath_operations and toolpath_files
DROP POLICY IF EXISTS toolpath_operations_backend_all ON public.toolpath_operations;
CREATE POLICY toolpath_operations_backend_all ON public.toolpath_operations
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS toolpath_files_backend_all ON public.toolpath_files;
CREATE POLICY toolpath_files_backend_all ON public.toolpath_files
  FOR ALL TO app_backend USING (true) WITH CHECK (true);
