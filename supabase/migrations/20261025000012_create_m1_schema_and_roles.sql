-- CNC SmartCore Unified Platform
-- Migration: 20261025000012_create_m1_schema_and_roles.sql
-- Purpose: Create 'm1' schema, database roles, and Module 1 monitoring tables

-- 1. Create Module 1 Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'm1_backend') THEN
    CREATE ROLE m1_backend WITH LOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'm1_migrator') THEN
    CREATE ROLE m1_migrator WITH LOGIN;
  END IF;
END $$;

-- 2. Schema and Privileges
CREATE SCHEMA IF NOT EXISTS m1;
REVOKE ALL ON SCHEMA m1 FROM public, anon;
GRANT USAGE, CREATE ON SCHEMA m1 TO m1_migrator;
GRANT USAGE ON SCHEMA m1 TO m1_backend, app_backend, authenticated;

-- Helper trigger function for updated_at in m1
CREATE OR REPLACE FUNCTION m1.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Machines Master Table
CREATE TABLE IF NOT EXISTS m1.machines (
    id                      BIGSERIAL       PRIMARY KEY,
    machine_code            VARCHAR(50)     NOT NULL UNIQUE,
    name                    VARCHAR(100)    NOT NULL,
    model                   VARCHAR(100),
    manufacturer            VARCHAR(100),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'OFFLINE'
                                CHECK (status IN ('IDLE','RUNNING','MAINTENANCE','ERROR','OFFLINE')),
    location                VARCHAR(100),
    ip_address              VARCHAR(45),
    max_spindle_speed       INTEGER,
    max_feed_rate           DOUBLE PRECISION,
    last_maintenance_date   TIMESTAMP,
    next_maintenance_date   TIMESTAMP,
    installation_date       TIMESTAMP,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_m1_machines_updated_at
    BEFORE UPDATE ON m1.machines
    FOR EACH ROW EXECUTE FUNCTION m1.update_updated_at_column();

-- 4. Machine Metrics (Partitioned table by month)
CREATE TABLE IF NOT EXISTS m1.machine_metrics (
    id                  BIGSERIAL           NOT NULL,
    machine_id          BIGINT              NOT NULL REFERENCES m1.machines(id) ON DELETE CASCADE,
    spindle_speed       DOUBLE PRECISION,
    feed_rate           DOUBLE PRECISION,
    spindle_load        DOUBLE PRECISION,
    temperature         DOUBLE PRECISION,
    vibration_x         DOUBLE PRECISION,
    vibration_y         DOUBLE PRECISION,
    vibration_z         DOUBLE PRECISION,
    power_consumption   DOUBLE PRECISION,
    coolant_level       DOUBLE PRECISION,
    coolant_temperature DOUBLE PRECISION,
    cutting_force       DOUBLE PRECISION,
    axis_position_x     DOUBLE PRECISION,
    axis_position_y     DOUBLE PRECISION,
    axis_position_z     DOUBLE PRECISION,
    cycle_time          DOUBLE PRECISION,
    parts_produced      INTEGER,
    tool_id             BIGINT,
    recorded_at         TIMESTAMP           NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Generate monthly partitions for the next 12 months
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', NOW());
    partition_date DATE;
    partition_name TEXT;
    next_month DATE;
BEGIN
    FOR i IN 0..11 LOOP
        partition_date := start_date + (i || ' months')::INTERVAL;
        next_month     := partition_date + INTERVAL '1 month';
        partition_name := 'm1.machine_metrics_' || TO_CHAR(partition_date, 'YYYY_MM');

        EXECUTE FORMAT(
            'CREATE TABLE IF NOT EXISTS %s PARTITION OF m1.machine_metrics
             FOR VALUES FROM (%L) TO (%L);',
            partition_name, partition_date, next_month
        );
    END LOOP;
END $$;

-- 5. Production Jobs and Job Queue
CREATE TABLE IF NOT EXISTS m1.production_jobs (
    id                      BIGSERIAL       PRIMARY KEY,
    job_number              VARCHAR(50)     NOT NULL UNIQUE,
    part_name               VARCHAR(150)    NOT NULL,
    part_number             VARCHAR(100),
    material                VARCHAR(100),
    machine_id              BIGINT          REFERENCES m1.machines(id) ON DELETE SET NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','QUEUED','SETUP','IN_PROGRESS',
                                                  'ON_HOLD','COMPLETED','CANCELLED','FAILED')),
    priority                INTEGER         NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    quantity_required       INTEGER         NOT NULL DEFAULT 1,
    quantity_completed      INTEGER         NOT NULL DEFAULT 0,
    estimated_cycle_time    DOUBLE PRECISION,
    actual_cycle_time       DOUBLE PRECISION,
    estimated_setup_time    DOUBLE PRECISION,
    nc_program_path         VARCHAR(500),
    scheduled_start         TIMESTAMP,
    scheduled_end           TIMESTAMP,
    actual_start            TIMESTAMP,
    actual_end              TIMESTAMP,
    due_date                TIMESTAMP,
    notes                   TEXT,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m1.job_queue (
    id                      BIGSERIAL       PRIMARY KEY,
    machine_id              BIGINT          NOT NULL REFERENCES m1.machines(id) ON DELETE CASCADE,
    job_id                  BIGINT          NOT NULL REFERENCES m1.production_jobs(id) ON DELETE CASCADE,
    queue_position          INTEGER         NOT NULL,
    algorithm_used          VARCHAR(20)     NOT NULL DEFAULT 'FIFO'
                                CHECK (algorithm_used IN ('FIFO','SPT','EDD','CR','PRIORITY')),
    scheduled_start         TIMESTAMP,
    scheduled_end           TIMESTAMP,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_m1_machine_position UNIQUE (machine_id, queue_position)
);

-- 6. Alerts Table
CREATE TABLE IF NOT EXISTS m1.alerts (
    id                      BIGSERIAL       PRIMARY KEY,
    machine_id              BIGINT          NOT NULL REFERENCES m1.machines(id) ON DELETE CASCADE,
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

-- 7. Tools and Tool Usage
CREATE TABLE IF NOT EXISTS m1.tools (
    id                      BIGSERIAL       PRIMARY KEY,
    tool_code               VARCHAR(50)     NOT NULL UNIQUE,
    name                    VARCHAR(150)    NOT NULL,
    tool_type               VARCHAR(30)     NOT NULL
                                CHECK (tool_type IN (
                                    'END_MILL','DRILL','REAMER','BORING_BAR','FACE_MILL',
                                    'TAP','THREAD_MILL','INSERT','BALL_NOSE',
                                    'CHAMFER','TURNING_INSERT')),
    material                VARCHAR(100),
    diameter                DOUBLE PRECISION,
    length                  DOUBLE PRECISION,
    number_of_flutes        INTEGER,
    max_life_minutes        DOUBLE PRECISION,
    used_life_minutes       DOUBLE PRECISION    NOT NULL DEFAULT 0,
    wear_percentage         DOUBLE PRECISION    NOT NULL DEFAULT 0
                                CHECK (wear_percentage BETWEEN 0 AND 100),
    condition               VARCHAR(15)     NOT NULL DEFAULT 'NEW'
                                CHECK (condition IN ('NEW','GOOD','WORN','CRITICAL','REPLACED','BROKEN')),
    current_machine_id      BIGINT          REFERENCES m1.machines(id) ON DELETE SET NULL,
    tool_magazine_slot      INTEGER,
    replacement_threshold   DOUBLE PRECISION    NOT NULL DEFAULT 80,
    last_replaced_at        TIMESTAMP,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS m1.tool_usage (
    id                      BIGSERIAL       PRIMARY KEY,
    tool_id                 BIGINT          NOT NULL REFERENCES m1.tools(id) ON DELETE CASCADE,
    machine_id              BIGINT          NOT NULL REFERENCES m1.machines(id) ON DELETE CASCADE,
    job_id                  BIGINT          REFERENCES m1.production_jobs(id) ON DELETE SET NULL,
    start_time              TIMESTAMP       NOT NULL DEFAULT NOW(),
    end_time                TIMESTAMP,
    duration_minutes        DOUBLE PRECISION,
    avg_spindle_speed       DOUBLE PRECISION,
    avg_feed_rate           DOUBLE PRECISION,
    avg_cutting_force       DOUBLE PRECISION,
    parts_machined          INTEGER
);

-- Seed initial 5 demo machines
INSERT INTO m1.machines (machine_code, name, model, manufacturer, status, location, ip_address, max_spindle_speed, max_feed_rate, is_active)
VALUES
    ('CNC-001', 'Haas VF-2',           'VF-2',      'Haas',     'IDLE', 'LINE-A', '192.168.1.101', 12000, 30000, TRUE),
    ('CNC-002', 'DMG Mori NLX 2500',   'NLX-2500',  'DMG Mori', 'IDLE', 'LINE-A', '192.168.1.102', 10000, 25000, TRUE),
    ('CNC-003', 'Fanuc Robodrill D21',  'D21MiB5',   'Fanuc',    'IDLE', 'LINE-B', '192.168.1.103', 15000, 40000, TRUE),
    ('CNC-004', 'Mazak Variaxis i-700', 'i-700',     'Mazak',    'IDLE', 'LINE-B', '192.168.1.104', 12000, 30000, TRUE),
    ('CNC-005', 'Okuma Genos M460',     'M460-VE',   'Okuma',    'IDLE', 'LINE-C', '192.168.1.105', 10000, 20000, TRUE)
ON CONFLICT (machine_code) DO NOTHING;

-- Enable RLS on all m1 tables immediately upon creation (Rule 8)
ALTER TABLE m1.machines        ENABLE ROW LEVEL SECURITY;
ALTER TABLE m1.machine_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE m1.production_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE m1.job_queue       ENABLE ROW LEVEL SECURITY;
ALTER TABLE m1.alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE m1.tools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE m1.tool_usage      ENABLE ROW LEVEL SECURITY;
