-- ============================================================
-- V3__create_jobs_table.sql
-- CNC SmartCore – Production jobs and scheduling queue
-- ============================================================

-- ── Production Jobs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS production_jobs (
    id                      BIGSERIAL       PRIMARY KEY,
    job_number              VARCHAR(50)     NOT NULL UNIQUE,
    part_name               VARCHAR(150)    NOT NULL,
    part_number             VARCHAR(100),
    material                VARCHAR(100),
    machine_id              BIGINT          REFERENCES machines(id) ON DELETE SET NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','QUEUED','SETUP','IN_PROGRESS',
                                                  'ON_HOLD','COMPLETED','CANCELLED','FAILED')),
    priority                INTEGER         NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    quantity_required       INTEGER         NOT NULL DEFAULT 1,
    quantity_completed      INTEGER         NOT NULL DEFAULT 0,
    estimated_cycle_time    DOUBLE PRECISION,       -- seconds per part
    actual_cycle_time       DOUBLE PRECISION,
    estimated_setup_time    DOUBLE PRECISION,       -- minutes
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

CREATE TRIGGER trg_jobs_updated_at
    BEFORE UPDATE ON production_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_jobs_status          ON production_jobs (status);
CREATE INDEX idx_jobs_machine_status  ON production_jobs (machine_id, status);
CREATE INDEX idx_jobs_due_date        ON production_jobs (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_jobs_priority        ON production_jobs (priority, due_date);

-- ── Job Queue ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_queue (
    id                      BIGSERIAL       PRIMARY KEY,
    machine_id              BIGINT          NOT NULL REFERENCES machines(id)         ON DELETE CASCADE,
    job_id                  BIGINT          NOT NULL REFERENCES production_jobs(id)  ON DELETE CASCADE,
    queue_position          INTEGER         NOT NULL,
    scheduling_algorithm    VARCHAR(20)     DEFAULT 'PRIORITY'
                                CHECK (scheduling_algorithm IN ('FCFS','SPT','EDD','LPT','PRIORITY','GENETIC')),
    estimated_start         TIMESTAMP,
    estimated_end           TIMESTAMP,
    makespan                DOUBLE PRECISION,
    tardiness               DOUBLE PRECISION,
    is_active               BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW(),

    UNIQUE (machine_id, job_id, is_active)
);

CREATE TRIGGER trg_queue_updated_at
    BEFORE UPDATE ON job_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_jobqueue_machine_pos ON job_queue (machine_id, queue_position) WHERE is_active = TRUE;

-- Demo jobs
INSERT INTO production_jobs (job_number, part_name, part_number, material,
                               quantity_required, priority, status,
                               due_date, estimated_cycle_time, estimated_setup_time)
VALUES
    ('JOB-2024-001', 'Hydraulic Bracket',  'HB-1001', 'Aluminium 6061', 20, 1, 'PENDING',
     NOW() + INTERVAL '3 days',  300, 30),
    ('JOB-2024-002', 'Shaft Housing',      'SH-2045', 'Steel 4140',     10, 2, 'PENDING',
     NOW() + INTERVAL '5 days',  600, 45),
    ('JOB-2024-003', 'Cover Plate',        'CP-3012', 'Stainless 316',  50, 3, 'PENDING',
     NOW() + INTERVAL '7 days',  180, 20),
    ('JOB-2024-004', 'Bearing Retainer',   'BR-4089', 'Aluminium 7075', 30, 4, 'PENDING',
     NOW() + INTERVAL '4 days',  240, 25),
    ('JOB-2024-005', 'Valve Body',         'VB-5023', 'Cast Iron',      15, 5, 'PENDING',
     NOW() + INTERVAL '6 days',  480, 60)
ON CONFLICT (job_number) DO NOTHING;
