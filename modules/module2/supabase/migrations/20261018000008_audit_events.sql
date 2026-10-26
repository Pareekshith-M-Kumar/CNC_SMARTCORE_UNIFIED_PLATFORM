-- CNC SmartCore Module 2: Audit Events (Immutable Append-Only Log)
-- Migration: 20261018000008_audit_events.sql

CREATE TABLE IF NOT EXISTS public.audit_events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    request_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at ON public.audit_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Grants & Revocations
REVOKE ALL ON TABLE public.audit_events FROM anon;
GRANT INSERT, SELECT ON TABLE public.audit_events TO app_backend;
GRANT SELECT ON TABLE public.audit_events TO authenticated;

-- Hard Immutability: Strictly revoke update, delete, and truncate from all application roles
REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_events FROM app_backend, authenticated, anon, public;

-- Policies for audit_events
DROP POLICY IF EXISTS audit_backend_insert ON public.audit_events;
CREATE POLICY audit_backend_insert ON public.audit_events
  FOR INSERT TO app_backend WITH CHECK (true);

DROP POLICY IF EXISTS audit_backend_select ON public.audit_events;
CREATE POLICY audit_backend_select ON public.audit_events
  FOR SELECT TO app_backend USING (true);

DROP POLICY IF EXISTS audit_admin_select ON public.audit_events;
CREATE POLICY audit_admin_select ON public.audit_events
  FOR SELECT TO authenticated
  USING ((SELECT private.app_role()) = 'admin');
