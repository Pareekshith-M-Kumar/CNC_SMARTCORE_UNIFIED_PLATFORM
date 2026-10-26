-- CNC SmartCore Module 2: Storage Buckets Configuration
-- Migration: 20261018000009_storage_buckets.sql

-- Insert storage buckets if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES
      ('cad-originals', 'cad-originals', false, 52428800, ARRAY['model/stl', 'application/sla', 'application/step', 'application/iges', 'application/octet-stream']),
      ('cad-previews', 'cad-previews', false, 52428800, ARRAY['model/gltf-binary', 'application/octet-stream']),
      ('toolpaths', 'toolpaths', false, 52428800, ARRAY['application/json', 'text/plain', 'application/octet-stream']),
      ('reports', 'reports', false, 10485760, ARRAY['application/json', 'application/pdf'])
    ON CONFLICT (id) DO UPDATE
      SET public = false,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
