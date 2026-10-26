-- ============================================================
-- V4__create_alerts_table.sql
-- CNC SmartCore – Machine alerts (threshold violations, predictions)
-- ============================================================

CREATE TABLE IF NOT EXISTS alerts (
    id                      BIGSERIAL       PRIMARY KEY,
    machine_id              BIGINT          NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    alert_type              VARCHAR(30)     NOT NULL
                                CHECK (alert_type IN (
                                    'TEMPERATURE_HIGH','VIBRATION_ANOMALY','TOOL_WEAR',
                                    'SPINDLE_OVERLOAD','COOLANT_LOW','POWER_SPIKE',
                                    'MAINTENANCE_DUE','PREDICTIVE_FAILURE',
                                    'JOB_DELAY','QUALITY_DEVIATION','CONNECTIVITY_LOST')),
    severity                VARCHAR(15)     NOT NULL
                                CHECK (severity IN ('INFO','WARNING','CRITICAL','EMERGENCY')),
    status                  VARCHAR(15)     NOT NULL DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED','SUPPRESSED')),
    title                   VARCHAR(200)    NOT NULL,
    message                 TEXT,
    metric_name             VARCHAR(100),
    metric_value            DOUBLE PRECISION,
    threshold_value         DOUBLE PRECISION,
    acknowledged_by         VARCHAR(100),
    acknowledged_at         TIMESTAMP,
    resolved_at             TIMESTAMP,
    resolution_note         TEXT,
    ml_confidence_score     DOUBLE PRECISION CHECK (ml_confidence_score BETWEEN 0 AND 1),
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- Indices for fast dashboard queries
CREATE INDEX idx_alerts_machine_status  ON alerts (machine_id, status);
CREATE INDEX idx_alerts_status_severity ON alerts (status, severity);
CREATE INDEX idx_alerts_created_at      ON alerts (created_at DESC);
CREATE INDEX idx_alerts_type_open       ON alerts (machine_id, alert_type)
    WHERE status = 'OPEN';

-- Demo alerts
DO $$
DECLARE
    m1 BIGINT; m2 BIGINT; m3 BIGINT;
BEGIN
    SELECT id INTO m1 FROM machines WHERE machine_code = 'CNC-001' LIMIT 1;
    SELECT id INTO m2 FROM machines WHERE machine_code = 'CNC-002' LIMIT 1;
    SELECT id INTO m3 FROM machines WHERE machine_code = 'CNC-003' LIMIT 1;

    IF m1 IS NOT NULL THEN
        INSERT INTO alerts (machine_id, alert_type, severity, status, title, message,
                            metric_name, metric_value, threshold_value)
        VALUES
            (m1, 'TEMPERATURE_HIGH', 'WARNING', 'OPEN',
             'High Temperature Detected',
             'CNC-001 temperature 78.4°C exceeds threshold 75.0°C',
             'temperature', 78.4, 75.0),
            (m2, 'TOOL_WEAR', 'WARNING', 'OPEN',
             'Tool Wear Critical: T003',
             'Tool T003 (32mm Face Mill) wear at 85% — replacement threshold is 80%',
             'wear_percentage', 85.0, 80.0),
            (m3, 'PREDICTIVE_FAILURE', 'CRITICAL', 'OPEN',
             'Predictive Failure Risk: bearing',
             'ML model predicts 88% probability of bearing failure within 24 hours',
             'failure_probability', 0.88, 0.75);
    END IF;
END $$;
