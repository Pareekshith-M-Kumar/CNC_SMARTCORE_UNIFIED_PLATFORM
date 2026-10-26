-- CNC SmartCore Module 2: Materials Catalog and Recommendations
-- Migration: 20261018000003_materials_schema.sql

-- Materials Catalog Table
CREATE TABLE IF NOT EXISTS public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('ALUMINIUM', 'STEEL', 'STAINLESS', 'TITANIUM', 'BRASS', 'PLASTIC')),
    density_kg_m3 NUMERIC NOT NULL,
    kc_n_mm2 NUMERIC NOT NULL,
    vc_min_m_min NUMERIC NOT NULL,
    vc_max_m_min NUMERIC NOT NULL,
    fz_factor NUMERIC NOT NULL,
    strength_rating SMALLINT NOT NULL CHECK (strength_rating BETWEEN 1 AND 5),
    lightness_rating SMALLINT NOT NULL CHECK (lightness_rating BETWEEN 1 AND 5),
    corrosion_rating SMALLINT NOT NULL CHECK (corrosion_rating BETWEEN 1 AND 5),
    machinability_rating SMALLINT NOT NULL CHECK (machinability_rating BETWEEN 1 AND 5),
    cost_level SMALLINT NOT NULL CHECK (cost_level BETWEEN 1 AND 5),
    cost_per_kg NUMERIC NOT NULL,
    suitable_applications TEXT[] DEFAULT '{}',
    notes TEXT,
    is_sample_data BOOLEAN NOT NULL DEFAULT true,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link FK from cad_versions to materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cad_versions_material'
      AND table_name = 'cad_versions'
  ) THEN
    ALTER TABLE public.cad_versions
      ADD CONSTRAINT fk_cad_versions_material
      FOREIGN KEY (selected_material_id) REFERENCES public.materials(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Material Recommendations Table
CREATE TABLE IF NOT EXISTS public.material_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cad_version_id UUID NOT NULL REFERENCES public.cad_versions(id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    inputs JSONB NOT NULL,
    results JSONB NOT NULL,
    algorithm_version TEXT NOT NULL DEFAULT 'rb-1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mat_rec_cad_version ON public.material_recommendations(cad_version_id);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_recommendations ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.materials FROM anon;
REVOKE ALL ON TABLE public.material_recommendations FROM anon;
GRANT SELECT ON TABLE public.materials TO authenticated;
GRANT SELECT ON TABLE public.material_recommendations TO authenticated;
GRANT ALL ON TABLE public.materials TO app_backend;
GRANT ALL ON TABLE public.material_recommendations TO app_backend;

-- Policies for materials
DROP POLICY IF EXISTS materials_backend_all ON public.materials;
CREATE POLICY materials_backend_all ON public.materials
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS materials_select ON public.materials;
CREATE POLICY materials_select ON public.materials
  FOR SELECT TO authenticated
  USING (true);

-- Policies for material_recommendations
DROP POLICY IF EXISTS material_recommendations_backend_all ON public.material_recommendations;
CREATE POLICY material_recommendations_backend_all ON public.material_recommendations
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS material_recommendations_select ON public.material_recommendations;
CREATE POLICY material_recommendations_select ON public.material_recommendations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cad_versions cv
      JOIN public.cad_assets ca ON cv.asset_id = ca.id
      WHERE cv.id = material_recommendations.cad_version_id
        AND (
          ca.owner_id = (SELECT auth.uid())
          OR (SELECT private.app_role()) IN ('cam_engineer', 'approver', 'admin')
        )
    )
  );
