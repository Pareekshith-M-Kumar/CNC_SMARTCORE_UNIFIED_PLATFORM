-- CNC SmartCore Module 2: CAD Assets and Versions
-- Migration: 20261018000002_cad_schema.sql

-- CAD Assets Table
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

-- CAD Versions Table (Immutable geometry payload)
CREATE TABLE IF NOT EXISTS public.cad_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES public.cad_assets(id) ON DELETE RESTRICT,
    version_number INT NOT NULL,
    original_filename TEXT NOT NULL,
    file_format TEXT NOT NULL CHECK (file_format IN ('STL', 'STEP', 'IGES')),
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes <= 52428800),
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
    selected_material_id UUID, -- Foreign key to materials added in next migration
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cad_versions_asset_version UNIQUE (asset_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_cad_versions_asset ON public.cad_versions(asset_id);
CREATE INDEX IF NOT EXISTS idx_cad_versions_sha256 ON public.cad_versions(sha256);

-- Enable RLS
ALTER TABLE public.cad_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cad_versions ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.cad_assets FROM anon;
REVOKE ALL ON TABLE public.cad_versions FROM anon;
GRANT SELECT ON TABLE public.cad_assets TO authenticated;
GRANT SELECT ON TABLE public.cad_versions TO authenticated;
GRANT ALL ON TABLE public.cad_assets TO app_backend;
GRANT ALL ON TABLE public.cad_versions TO app_backend;

-- Policies for cad_assets
DROP POLICY IF EXISTS cad_assets_backend_all ON public.cad_assets;
CREATE POLICY cad_assets_backend_all ON public.cad_assets
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cad_assets_select ON public.cad_assets;
CREATE POLICY cad_assets_select ON public.cad_assets
  FOR SELECT TO authenticated
  USING (
    owner_id = (SELECT auth.uid())
    OR (SELECT private.app_role()) IN ('cam_engineer', 'approver', 'admin')
  );

-- Policies for cad_versions
DROP POLICY IF EXISTS cad_versions_backend_all ON public.cad_versions;
CREATE POLICY cad_versions_backend_all ON public.cad_versions
  FOR ALL TO app_backend USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS cad_versions_select ON public.cad_versions;
CREATE POLICY cad_versions_select ON public.cad_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cad_assets a
      WHERE a.id = cad_versions.asset_id
        AND (
          a.owner_id = (SELECT auth.uid())
          OR (SELECT private.app_role()) IN ('cam_engineer', 'approver', 'admin')
        )
    )
  );
