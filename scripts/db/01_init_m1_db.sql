-- ============================================================================
-- DATABASE 1: cnc_m1_db (Shop-Floor CNC Monitoring Database)
-- Dedicated to Module 1: Machines, Real-Time Sensor Telemetry, Tools, Alarms
-- ============================================================================

-- Create tables if not exists
CREATE TABLE IF NOT EXISTS machines (
    id BIGSERIAL PRIMARY KEY,
    machine_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    manufacturer VARCHAR(100),
    status VARCHAR(30) DEFAULT 'IDLE',
    current_job_id VARCHAR(100),
    spindle_speed DOUBLE PRECISION DEFAULT 0.0,
    feed_rate DOUBLE PRECISION DEFAULT 0.0,
    temperature DOUBLE PRECISION DEFAULT 25.0,
    vibration DOUBLE PRECISION DEFAULT 0.0,
    asset_id UUID UNIQUE, -- 1:1 Link to Unified Platform Physical Asset
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS machine_metrics (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT REFERENCES machines(id) ON DELETE CASCADE,
    machine_code VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    spindle_speed DOUBLE PRECISION NOT NULL,
    feed_rate DOUBLE PRECISION NOT NULL,
    temperature DOUBLE PRECISION NOT NULL,
    vibration DOUBLE PRECISION NOT NULL,
    tool_wear DOUBLE PRECISION DEFAULT 0.0,
    power_kw DOUBLE PRECISION DEFAULT 0.0,
    axis_x DOUBLE PRECISION DEFAULT 0.0,
    axis_y DOUBLE PRECISION DEFAULT 0.0,
    axis_z DOUBLE PRECISION DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS tools (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT REFERENCES machines(id) ON DELETE SET NULL,
    tool_code VARCHAR(50) NOT NULL UNIQUE,
    tool_type VARCHAR(50) NOT NULL,
    diameter_mm DOUBLE PRECISION NOT NULL,
    current_wear_percent DOUBLE PRECISION DEFAULT 0.0,
    accumulated_hours DOUBLE PRECISION DEFAULT 0.0,
    max_life_hours DOUBLE PRECISION DEFAULT 100.0,
    status VARCHAR(30) DEFAULT 'OPERATIONAL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id BIGSERIAL PRIMARY KEY,
    machine_id BIGINT REFERENCES machines(id) ON DELETE CASCADE,
    machine_code VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
    message TEXT NOT NULL,
    metric_name VARCHAR(50),
    metric_value DOUBLE PRECISION,
    threshold_value DOUBLE PRECISION,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial Haas VF-2 and Bridgeport machines
INSERT INTO machines (machine_code, name, model, manufacturer, status, temperature, vibration)
VALUES 
    ('CNC-001', 'Haas VF-2 Vertical Mill', 'VF-2', 'Haas Automation', 'IDLE', 32.5, 0.42),
    ('CNC-002', 'Bridgeport 3-Axis Mill', 'Series 1', 'Bridgeport', 'IDLE', 28.0, 0.15)
ON CONFLICT (machine_code) DO NOTHING;

INSERT INTO tools (machine_id, tool_code, tool_type, diameter_mm, current_wear_percent, accumulated_hours, max_life_hours)
VALUES 
    (1, 'T01', 'Flat End Mill', 10.0, 15.0, 12.5, 80.0),
    (1, 'T02', 'Ball End Mill', 6.0, 22.0, 18.0, 60.0),
    (2, 'T03', 'Face Mill', 50.0, 8.5, 6.0, 120.0)
ON CONFLICT (tool_code) DO NOTHING;
