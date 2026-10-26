-- ============================================================
-- V6__create_indices.sql
-- CNC SmartCore – Additional performance indices and convenience views
-- ============================================================

-- ── Composite indices for common dashboard queries ────────────────────────────

-- Latest metrics per machine (used by dashboard status endpoint)
CREATE INDEX IF NOT EXISTS idx_metrics_machine_latest
    ON machine_metrics (machine_id, recorded_at DESC)
    INCLUDE (temperature, spindle_load, vibration_x, power_consumption);

-- Open alerts ordered by severity for alert centre
CREATE INDEX IF NOT EXISTS idx_alerts_open_severity
    ON alerts (severity, created_at DESC)
    WHERE status = 'OPEN';

-- Active queue per machine ordered by position (scheduling hot path)
CREATE INDEX IF NOT EXISTS idx_queue_machine_active_pos
    ON job_queue (machine_id, queue_position ASC)
    WHERE is_active = TRUE;

-- Jobs approaching due date (overdue detection)
CREATE INDEX IF NOT EXISTS idx_jobs_due_pending
    ON production_jobs (due_date ASC, status)
    WHERE status NOT IN ('COMPLETED', 'CANCELLED');

-- Tool replacement priority (tool wear dashboard)
CREATE INDEX IF NOT EXISTS idx_tools_replacement_priority
    ON tools (wear_percentage DESC, current_machine_id)
    WHERE is_active = TRUE AND wear_percentage >= 70;

-- ── Convenience Views ─────────────────────────────────────────────────────────

-- v_machine_live_status: join machines with their latest single metrics reading
CREATE OR REPLACE VIEW v_machine_live_status AS
SELECT
    m.id                AS machine_id,
    m.machine_code,
    m.name              AS machine_name,
    m.status,
    m.location,
    m.next_maintenance_date,
    lm.temperature,
    lm.spindle_load,
    lm.spindle_speed,
    lm.vibration_x,
    lm.vibration_y,
    lm.vibration_z,
    lm.power_consumption,
    lm.coolant_level,
    lm.feed_rate,
    lm.recorded_at      AS metrics_at,
    (SELECT COUNT(*) FROM alerts a
     WHERE a.machine_id = m.id AND a.status = 'OPEN') AS open_alert_count
FROM machines m
LEFT JOIN LATERAL (
    SELECT *
    FROM machine_metrics mm
    WHERE mm.machine_id = m.id
    ORDER BY mm.recorded_at DESC
    LIMIT 1
) lm ON TRUE
WHERE m.is_active = TRUE;

-- v_alert_summary: count open alerts grouped by machine and severity
CREATE OR REPLACE VIEW v_alert_summary AS
SELECT
    m.machine_code,
    m.name              AS machine_name,
    a.severity,
    COUNT(*)            AS alert_count
FROM alerts a
JOIN machines m ON m.id = a.machine_id
WHERE a.status = 'OPEN'
GROUP BY m.machine_code, m.name, a.severity
ORDER BY m.machine_code, a.severity;

-- v_tool_health: tools approaching replacement threshold
CREATE OR REPLACE VIEW v_tool_health AS
SELECT
    t.tool_code,
    t.name              AS tool_name,
    t.tool_type,
    t.wear_percentage,
    t.replacement_threshold,
    t.condition,
    t.max_life_minutes,
    t.used_life_minutes,
    (t.max_life_minutes - t.used_life_minutes) AS remaining_life_minutes,
    m.machine_code      AS on_machine,
    t.tool_magazine_slot
FROM tools t
LEFT JOIN machines m ON m.id = t.current_machine_id
WHERE t.is_active = TRUE
ORDER BY t.wear_percentage DESC;

-- v_job_schedule: active queue with estimated windows
CREATE OR REPLACE VIEW v_job_schedule AS
SELECT
    jq.queue_position,
    m.machine_code,
    pj.job_number,
    pj.part_name,
    pj.material,
    pj.quantity_required,
    pj.quantity_completed,
    pj.priority,
    pj.status          AS job_status,
    jq.scheduling_algorithm,
    jq.estimated_start,
    jq.estimated_end,
    pj.due_date,
    CASE
        WHEN jq.estimated_end > pj.due_date THEN
            EXTRACT(EPOCH FROM (jq.estimated_end - pj.due_date)) / 60
        ELSE 0
    END                AS tardiness_minutes
FROM job_queue jq
JOIN machines m       ON m.id  = jq.machine_id
JOIN production_jobs pj ON pj.id = jq.job_id
WHERE jq.is_active = TRUE
ORDER BY m.machine_code, jq.queue_position;
