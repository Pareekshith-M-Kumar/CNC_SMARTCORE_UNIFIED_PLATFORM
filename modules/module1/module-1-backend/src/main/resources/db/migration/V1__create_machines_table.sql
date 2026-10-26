-- ============================================================
-- V1__create_machines_table.sql
-- CNC SmartCore – Machine master table
-- ============================================================

CREATE TABLE IF NOT EXISTS machines (
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

-- Auto-update updated_at on every write
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_machines_updated_at
    BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Useful lookup indices
CREATE INDEX idx_machines_status   ON machines (status);
CREATE INDEX idx_machines_location ON machines (location);
CREATE INDEX idx_machines_active   ON machines (is_active) WHERE is_active = TRUE;

-- Seed 5 demo machines (dev convenience – safe to remove for production)
INSERT INTO machines (machine_code, name, model, manufacturer, status, location,
                      ip_address, max_spindle_speed, max_feed_rate, is_active)
VALUES
    ('CNC-001', 'Haas VF-2',           'VF-2',      'Haas',    'IDLE',  'LINE-A', '192.168.1.101', 12000, 30000, TRUE),
    ('CNC-002', 'DMG Mori NLX 2500',   'NLX-2500',  'DMG Mori','IDLE',  'LINE-A', '192.168.1.102', 10000, 25000, TRUE),
    ('CNC-003', 'Fanuc Robodrill D21',  'D21MiB5',   'Fanuc',   'IDLE',  'LINE-B', '192.168.1.103', 15000, 40000, TRUE),
    ('CNC-004', 'Mazak Variaxis i-700', 'i-700',     'Mazak',   'IDLE',  'LINE-B', '192.168.1.104', 12000, 30000, TRUE),
    ('CNC-005', 'Okuma Genos M460',     'M460-VE',   'Okuma',   'IDLE',  'LINE-C', '192.168.1.105', 10000, 20000, TRUE)
ON CONFLICT (machine_code) DO NOTHING;
