-- ============================================================
-- V2__create_machine_metrics_table.sql
-- CNC SmartCore – Real-time sensor readings per machine
-- Uses table partitioning by month for high-volume time-series data
-- ============================================================

CREATE TABLE IF NOT EXISTS machine_metrics (
    id                  BIGSERIAL           NOT NULL,
    machine_id          BIGINT              NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    spindle_speed       DOUBLE PRECISION,           -- RPM
    feed_rate           DOUBLE PRECISION,           -- mm/min
    spindle_load        DOUBLE PRECISION,           -- % of max load
    temperature         DOUBLE PRECISION,           -- °C
    vibration_x         DOUBLE PRECISION,           -- mm/s²
    vibration_y         DOUBLE PRECISION,
    vibration_z         DOUBLE PRECISION,
    power_consumption   DOUBLE PRECISION,           -- kW
    coolant_level       DOUBLE PRECISION,           -- %
    coolant_temperature DOUBLE PRECISION,           -- °C
    cutting_force       DOUBLE PRECISION,           -- N
    axis_position_x     DOUBLE PRECISION,           -- mm
    axis_position_y     DOUBLE PRECISION,
    axis_position_z     DOUBLE PRECISION,
    cycle_time          DOUBLE PRECISION,           -- seconds
    parts_produced      INTEGER,
    tool_id             BIGINT,
    recorded_at         TIMESTAMP           NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions for the next 12 months
-- (In production, automate partition creation with pg_partman or a cron job.)
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
        partition_name := 'machine_metrics_' || TO_CHAR(partition_date, 'YYYY_MM');

        EXECUTE FORMAT(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF machine_metrics
             FOR VALUES FROM (%L) TO (%L)',
            partition_name, partition_date, next_month
        );
    END LOOP;
END $$;

-- Indexes (created on the parent table; Postgres applies them to each partition)
CREATE INDEX IF NOT EXISTS idx_metrics_machine_timestamp
    ON machine_metrics (machine_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_temperature
    ON machine_metrics (machine_id, temperature)
    WHERE temperature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_metrics_spindle_load
    ON machine_metrics (machine_id, spindle_load)
    WHERE spindle_load IS NOT NULL;
