-- CNC SmartCore Module 2: Manufacturing Approvals and Traceability Records
-- Migration: 20261018000007_approvals_schema.sql

-- Manufacturing Approvals Table (Final governance gate and immutable plan snapshot)
CREATE TABLE IF NOT EXISTS public.manufacturing_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cam_job_id UUID NOT NULL REFERENCES public.cam_jobs(id) ON DELETE RESTRICT,
    cad_version_id UUID NOT NULL REFERENCES public.cad_versions(id) ON DELETE RESTRICT,
    simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE RESTRICT,
    toolpath_file_id UUID NOT NULL REFERENCES public.toolpath_files(id) ON DELETE RESTRICT,
    gcode_file_id UUID REFERENCES public.toolpath_files(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    submit_note TEXT,
    decided_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    decided_at TIMESTAMPTZ,
    decision_comment TEXT,
    integrity_verified BOOLEAN,
    integrity_checked_at TIMESTAMPTZ,
    plan_snapshot JSONB,
    plan_hash CHAR(64),
    row_version INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Enforce Separation of Duties: The approver cannot be the submitter
    CONSTRAINT chk_separation_of_duties CHECK (decided_by IS NULL OR decided_by <> submitted_by),

    -- Enforce Plan Hash requirement upon approval
    CONSTRAINT chk_approved_plan_hash CHECK (status <> 'APPROVED' OR (plan_hash IS NOT NULL AND plan_snapshot IS NOT NULL))
);

-- Partial index: only one active PENDING approval per CAM job
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_approval_per_job
  ON public.manufacturing_approvals(cam_job_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.manufacturing_approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_submitted_by ON public.manufacturing_approvals(submitted_by);
CREATE INDEX IF NOT EXISTS idx_approvals_decided_by ON public.manufacturing_approvals(decided_by);

-- Enable RLS
ALTER TABLE public.manufacturing_approvals ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.manufacturing_approvals FROM anon;
GRANT SELECT ON TABLE public.manufacturing_approvals TO authenticated;
GRANT ALL ON TABLE public.manufacturing_approvals TO app_backend;

-- Policies for manufacturing_approvals
DROP POLICY IF EXISTS manufacturing_approvals_backend_all ON public.manufacturing_approvals;
CREATE POLICY manufacturing_approvals_backend_all ON public.manufacturing_approvals
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS manufacturing_approvals_select ON public.manufacturing_approvals;
CREATE POLICY manufacturing_approvals_select ON public.manufacturing_approvals
  FOR SELECT TO authenticated
  USING (
    (SELECT private.app_role()) IN ('approver', 'admin')
    OR submitted_by = (SELECT auth.uid())
  );
