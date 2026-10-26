-- CNC SmartCore Unified Platform
-- Migration: 20261025000014_core_and_m1_rls_policies.sql
-- Purpose: Grant permissions and define RLS policies for core and m1 schemas

-- 1. Table Grants to Backend Roles
GRANT ALL ON ALL TABLES IN SCHEMA core TO app_backend;
GRANT ALL ON ALL SEQUENCES IN SCHEMA core TO app_backend;

GRANT ALL ON ALL TABLES IN SCHEMA m1 TO m1_backend, m1_migrator;
GRANT ALL ON ALL SEQUENCES IN SCHEMA m1 TO m1_backend, m1_migrator;

-- Module 2 backend needs SELECT/UPDATE on m1.machines to link assets
GRANT SELECT, UPDATE ON m1.machines TO app_backend;

-- Module 1 backend needs SELECT on core.assets and public.profiles
GRANT SELECT ON core.assets TO m1_backend;
GRANT SELECT ON public.profiles TO m1_backend;

-- 2. Authenticated Client Permissions (Read & scoped operations via RLS)
GRANT SELECT ON ALL TABLES IN SCHEMA core TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA m1 TO authenticated;

-- Revoke all table access from anon (Rule 8)
REVOKE ALL ON ALL TABLES IN SCHEMA core FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA m1 FROM anon;

-- 3. RLS Policies for Schema 'core'

-- Backend service full access
CREATE POLICY mo_backend_all ON core.manufacturing_orders FOR ALL TO app_backend USING (true) WITH CHECK (true);
CREATE POLICY sh_backend_all ON core.shipments FOR ALL TO app_backend USING (true) WITH CHECK (true);
CREATE POLICY se_backend_all ON core.shipment_events FOR ALL TO app_backend USING (true) WITH CHECK (true);
CREATE POLICY as_backend_all ON core.assets FOR ALL TO app_backend USING (true) WITH CHECK (true);
CREATE POLICY ar_backend_all ON core.asset_registrations FOR ALL TO app_backend USING (true) WITH CHECK (true);

-- Authenticated Users: Orders (Admins see all; others see orders they created or are recipient of)
CREATE POLICY mo_auth_select ON core.manufacturing_orders FOR SELECT TO authenticated
  USING (
    (SELECT private.app_role()) = 'admin'
    OR created_by = (SELECT auth.uid())
    OR recipient_id = (SELECT auth.uid())
  );

-- Authenticated Users: Shipments
CREATE POLICY sh_auth_select ON core.shipments FOR SELECT TO authenticated
  USING (
    (SELECT private.app_role()) IN ('admin', 'operator')
    OR EXISTS (
      SELECT 1 FROM core.manufacturing_orders o
      WHERE o.id = core.shipments.order_id
        AND (o.created_by = (SELECT auth.uid()) OR o.recipient_id = (SELECT auth.uid()))
    )
  );

-- Authenticated Users: Assets
CREATE POLICY as_auth_select ON core.assets FOR SELECT TO authenticated
  USING (
    (SELECT private.app_role()) IN ('admin', 'operator')
    OR owner_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM core.manufacturing_orders o
      WHERE o.id = core.assets.order_id
        AND (o.created_by = (SELECT auth.uid()) OR o.recipient_id = (SELECT auth.uid()))
    )
  );

-- 4. RLS Policies for Schema 'm1'

-- Backend services full access
CREATE POLICY m1_machines_backend ON m1.machines FOR ALL TO m1_backend, app_backend USING (true) WITH CHECK (true);
CREATE POLICY m1_metrics_backend  ON m1.machine_metrics FOR ALL TO m1_backend USING (true) WITH CHECK (true);
CREATE POLICY m1_jobs_backend     ON m1.production_jobs FOR ALL TO m1_backend USING (true) WITH CHECK (true);
CREATE POLICY m1_queue_backend    ON m1.job_queue FOR ALL TO m1_backend USING (true) WITH CHECK (true);
CREATE POLICY m1_alerts_backend   ON m1.alerts FOR ALL TO m1_backend USING (true) WITH CHECK (true);
CREATE POLICY m1_tools_backend    ON m1.tools FOR ALL TO m1_backend USING (true) WITH CHECK (true);
CREATE POLICY m1_usage_backend    ON m1.tool_usage FOR ALL TO m1_backend USING (true) WITH CHECK (true);

-- Authenticated Users: View monitoring machines
CREATE POLICY m1_machines_select ON m1.machines FOR SELECT TO authenticated
  USING (
    (SELECT private.app_role()) IN ('admin', 'operator', 'cam_engineer', 'designer')
    OR (
      (SELECT private.app_role()) = 'customer'
      AND EXISTS (
        SELECT 1 FROM core.assets a
        WHERE a.id = m1.machines.asset_id
          AND a.owner_id = (SELECT auth.uid())
      )
    )
  );

-- Authenticated Users: View telemetry and alerts for visible machines
CREATE POLICY m1_metrics_select ON m1.machine_metrics FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM m1.machines m WHERE m.id = m1.machine_metrics.machine_id)
  );

CREATE POLICY m1_alerts_select ON m1.alerts FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM m1.machines m WHERE m.id = m1.alerts.machine_id)
  );

CREATE POLICY m1_jobs_select ON m1.production_jobs FOR SELECT TO authenticated
  USING ((SELECT private.app_role()) IN ('admin', 'operator'));

CREATE POLICY m1_tools_select ON m1.tools FOR SELECT TO authenticated
  USING ((SELECT private.app_role()) IN ('admin', 'operator'));
