-- CNC SmartCore Module 2: Simulations and Findings
-- Migration: 20261018000006_simulation_schema.sql

-- Simulations Table (Immutable risk-analysis runs)
CREATE TABLE IF NOT EXISTS public.simulations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cam_job_id UUID NOT NULL REFERENCES public.cam_jobs(id) ON DELETE CASCADE,
    toolpath_file_id UUID NOT NULL REFERENCES public.toolpath_files(id) ON DELETE RESTRICT,
    status TEXT NOT NULL CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
    overall_result TEXT NOT NULL CHECK (overall_result IN ('PASS', 'WARN', 'FAIL')),
    stats JSONB,
    ruleset_version TEXT NOT NULL DEFAULT 'sim-1.0',
    run_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulations_cam_job ON public.simulations(cam_job_id);

-- Simulation Findings Table (Individual rule check results)
CREATE TABLE IF NOT EXISTS public.simulation_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_id UUID NOT NULL REFERENCES public.simulations(id) ON DELETE CASCADE,
    rule_code TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARN', 'FAIL')),
    message TEXT NOT NULL,
    move_index INT,
    x_mm NUMERIC,
    y_mm NUMERIC,
    z_mm NUMERIC,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_simulation_findings_sim ON public.simulation_findings(simulation_id);

-- Enable RLS
ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_findings ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.simulations FROM anon;
REVOKE ALL ON TABLE public.simulation_findings FROM anon;
GRANT SELECT ON TABLE public.simulations TO authenticated;
GRANT ALL ON TABLE public.simulations TO app_backend;
GRANT ALL ON TABLE public.simulation_findings TO app_backend;

-- Policies for simulations
DROP POLICY IF EXISTS simulations_backend_all ON public.simulations;
CREATE POLICY simulations_backend_all ON public.simulations
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS simulations_select ON public.simulations;
CREATE POLICY simulations_select ON public.simulations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cam_jobs cj
      WHERE cj.id = simulations.cam_job_id
        AND (
          cj.created_by = (SELECT auth.uid())
          OR (SELECT private.app_role()) IN ('cam_engineer', 'approver', 'admin')
        )
    )
  );

-- Backend-only policy for simulation_findings
DROP POLICY IF EXISTS simulation_findings_backend_all ON public.simulation_findings;
CREATE POLICY simulation_findings_backend_all ON public.simulation_findings
  FOR ALL TO app_backend USING (true) WITH CHECK (true);
