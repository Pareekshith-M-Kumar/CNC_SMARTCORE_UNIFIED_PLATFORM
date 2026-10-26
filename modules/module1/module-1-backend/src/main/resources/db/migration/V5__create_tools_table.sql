-- ============================================================
-- V5__create_tools_table.sql
-- CNC SmartCore – Cutting tool inventory and usage history
-- ============================================================

-- ── Tool Master ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tools (
    id                      BIGSERIAL       PRIMARY KEY,
    tool_code               VARCHAR(50)     NOT NULL UNIQUE,
    name                    VARCHAR(150)    NOT NULL,
    tool_type               VARCHAR(30)     NOT NULL
                                CHECK (tool_type IN (
                                    'END_MILL','DRILL','REAMER','BORING_BAR','FACE_MILL',
                                    'TAP','THREAD_MILL','INSERT','BALL_NOSE',
                                    'CHAMFER','TURNING_INSERT')),
    material                VARCHAR(100),
    diameter                DOUBLE PRECISION,           -- mm
    length                  DOUBLE PRECISION,           -- mm
    number_of_flutes        INTEGER,
    max_life_minutes        DOUBLE PRECISION,           -- manufacturer-rated life
    used_life_minutes       DOUBLE PRECISION    NOT NULL DEFAULT 0,
    wear_percentage         DOUBLE PRECISION    NOT NULL DEFAULT 0
                                CHECK (wear_percentage BETWEEN 0 AND 100),
    condition               VARCHAR(15)     NOT NULL DEFAULT 'NEW'
                                CHECK (condition IN ('NEW','GOOD','WORN','CRITICAL','REPLACED','BROKEN')),
    current_machine_id      BIGINT          REFERENCES machines(id) ON DELETE SET NULL,
    tool_magazine_slot      INTEGER,
    replacement_threshold   DOUBLE PRECISION    NOT NULL DEFAULT 80,
    last_replaced_at        TIMESTAMP,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tools_updated_at
    BEFORE UPDATE ON tools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_tools_machine      ON tools (current_machine_id);
CREATE INDEX idx_tools_condition    ON tools (condition);
CREATE INDEX idx_tools_wear         ON tools (wear_percentage DESC) WHERE is_active = TRUE;
CREATE INDEX idx_tools_needs_repl   ON tools (wear_percentage, replacement_threshold)
    WHERE is_active = TRUE AND wear_percentage >= replacement_threshold;

-- ── Tool Usage History ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_usage (
    id                          BIGSERIAL       PRIMARY KEY,
    tool_id                     BIGINT          NOT NULL REFERENCES tools(id)           ON DELETE CASCADE,
    machine_id                  BIGINT          NOT NULL REFERENCES machines(id)        ON DELETE CASCADE,
    job_id                      BIGINT          REFERENCES production_jobs(id)          ON DELETE SET NULL,
    usage_start                 TIMESTAMP,
    usage_end                   TIMESTAMP,
    duration_minutes            DOUBLE PRECISION,
    wear_before                 DOUBLE PRECISION,
    wear_after                  DOUBLE PRECISION,
    avg_spindle_speed           DOUBLE PRECISION,
    avg_feed_rate               DOUBLE PRECISION,
    avg_cutting_force           DOUBLE PRECISION,
    parts_machined              INTEGER,
    predicted_remaining_life    DOUBLE PRECISION,       -- minutes, from ML model
    notes                       TEXT,
    created_at                  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_usage_tool    ON tool_usage (tool_id);
CREATE INDEX idx_tool_usage_machine ON tool_usage (machine_id, usage_start DESC);
CREATE INDEX idx_tool_usage_job     ON tool_usage (job_id);

-- Demo tools
DO $$
DECLARE
    m1 BIGINT; m2 BIGINT; m3 BIGINT;
BEGIN
    SELECT id INTO m1 FROM machines WHERE machine_code = 'CNC-001' LIMIT 1;
    SELECT id INTO m2 FROM machines WHERE machine_code = 'CNC-002' LIMIT 1;
    SELECT id INTO m3 FROM machines WHERE machine_code = 'CNC-003' LIMIT 1;

    INSERT INTO tools (tool_code, name, tool_type, material, diameter, number_of_flutes,
                       max_life_minutes, used_life_minutes, wear_percentage,
                       condition, current_machine_id, tool_magazine_slot)
    VALUES
        ('T001', '20mm End Mill 4-Flute',    'END_MILL',  'Carbide', 20.0, 4, 200.0,  60.0,  30.0, 'GOOD',     m1, 1),
        ('T002', '10mm Drill Bit',           'DRILL',     'HSS',     10.0, 2, 150.0,  90.0,  60.0, 'WORN',     m1, 2),
        ('T003', '32mm Face Mill',           'FACE_MILL', 'Carbide', 32.0, 6, 180.0, 153.0,  85.0, 'CRITICAL', m2, 1),
        ('T004', '8mm Ball Nose 2-Flute',    'BALL_NOSE', 'Carbide',  8.0, 2, 120.0,  24.0,  20.0, 'GOOD',     m2, 2),
        ('T005', 'M12×1.75 Tap',            'TAP',       'HSS',      0.0, 0,  90.0,   9.0,  10.0, 'NEW',      m3, 1)
    ON CONFLICT (tool_code) DO NOTHING;
END $$;
