-- =====================================================
-- MODULE 1: DATABASE SCHEMA
-- =====================================================

-- 1. MACHINES TABLE
CREATE TABLE machines (
                          machine_id SERIAL PRIMARY KEY,
                          machine_code VARCHAR(50) UNIQUE NOT NULL,
                          machine_name VARCHAR(100) NOT NULL,
                          model VARCHAR(100),
                          manufacturer VARCHAR(100),
                          install_date DATE,
                          status VARCHAR(20) CHECK (status IN ('Running', 'Idle', 'Maintenance', 'Stopped')),
                          spindle_type VARCHAR(50),
                          max_spindle_speed INTEGER,
                          max_load_capacity DECIMAL(10,2),
                          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_machine_code ON machines (machine_code);
CREATE INDEX idx_status ON machines (status);


-- 2. MACHINE METRICS TABLE (Time-series data)
CREATE TABLE machine_metrics (
                                 metric_id BIGSERIAL PRIMARY KEY,
                                 machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
                                 timestamp TIMESTAMP NOT NULL,
                                 spindle_temperature DECIMAL(5,2),
                                 spindle_vibration DECIMAL(5,3),
                                 spindle_load DECIMAL(5,2),
                                 runtime_hours DECIMAL(10,2),
                                 runtime_minutes INTEGER,
                                 sensor_data JSONB,
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_machine_metrics_machine_id ON machine_metrics (machine_id);
CREATE INDEX idx_machine_metrics_timestamp ON machine_metrics (timestamp);
CREATE INDEX idx_machine_metrics_composite ON machine_metrics (machine_id, timestamp);


-- 3. PRODUCTION JOBS TABLE
CREATE TABLE production_jobs (
                                 job_id SERIAL PRIMARY KEY,
                                 job_code VARCHAR(50) UNIQUE NOT NULL,
                                 job_name VARCHAR(100) NOT NULL,
                                 design_id VARCHAR(50),
                                 material VARCHAR(100),
                                 estimated_time_minutes INTEGER,
                                 estimated_cost DECIMAL(10,2),
                                 priority INTEGER DEFAULT 5,
                                 status VARCHAR(20) CHECK (status IN ('Queued', 'Running', 'Completed', 'Failed', 'Paused')),
                                 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                 started_at TIMESTAMP,
                                 completed_at TIMESTAMP,
                                 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_job_code ON production_jobs (job_code);
CREATE INDEX idx_jobs_status ON production_jobs (status);
CREATE INDEX idx_created_at ON production_jobs (created_at);


-- 4. JOB QUEUE TABLE
CREATE TABLE job_queue (
                           queue_id SERIAL PRIMARY KEY,
                           job_id INTEGER NOT NULL UNIQUE REFERENCES production_jobs(job_id),
                           machine_id INTEGER REFERENCES machines(machine_id),
                           position_in_queue INTEGER,
                           scheduled_start_time TIMESTAMP,
                           scheduled_end_time TIMESTAMP,
                           actual_start_time TIMESTAMP,
                           actual_end_time TIMESTAMP,
                           queue_status VARCHAR(20),
                           created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_queue_machine_id ON job_queue (machine_id);
CREATE INDEX idx_position ON job_queue (position_in_queue);


-- 5. ALERTS TABLE
CREATE TABLE alerts (
                        alert_id SERIAL PRIMARY KEY,
                        machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
                        alert_type VARCHAR(50),
                        severity VARCHAR(20) CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
                        message TEXT,
                        is_acknowledged BOOLEAN DEFAULT FALSE,
                        acknowledged_by VARCHAR(100),
                        acknowledged_at TIMESTAMP,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        resolved_at TIMESTAMP
);

CREATE INDEX idx_alerts_machine_id ON alerts (machine_id);
CREATE INDEX idx_severity ON alerts (severity);
CREATE INDEX idx_alerts_created_at ON alerts (created_at);


-- 6. TOOLS TABLE
CREATE TABLE tools (
                       tool_id SERIAL PRIMARY KEY,
                       tool_code VARCHAR(50) UNIQUE NOT NULL,
                       tool_name VARCHAR(100) NOT NULL,
                       tool_type VARCHAR(50),
                       material VARCHAR(50),
                       max_rpm INTEGER,
                       cost DECIMAL(10,2),
                       lifespan_hours DECIMAL(10,2),
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tool_code ON tools (tool_code);


-- 7. TOOL USAGE TABLE
CREATE TABLE tool_usage (
                            usage_id SERIAL PRIMARY KEY,
                            machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
                            tool_id INTEGER NOT NULL REFERENCES tools(tool_id),
                            job_id INTEGER REFERENCES production_jobs(job_id),
                            hours_used DECIMAL(10,2),
                            wear_percentage DECIMAL(5,2),
                            replacement_recommended BOOLEAN DEFAULT FALSE,
                            installed_at TIMESTAMP,
                            replaced_at TIMESTAMP,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_machine_tool ON tool_usage (machine_id, tool_id);
CREATE INDEX idx_wear_percentage ON tool_usage (wear_percentage);


-- 8. MAINTENANCE RECORDS TABLE
CREATE TABLE maintenance_records (
                                     maintenance_id SERIAL PRIMARY KEY,
                                     machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
                                     maintenance_type VARCHAR(50),
                                     description TEXT,
                                     start_time TIMESTAMP,
                                     end_time TIMESTAMP,
                                     technician_name VARCHAR(100),
                                     parts_replaced TEXT,
                                     cost DECIMAL(10,2),
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_maintenance_machine_id ON maintenance_records (machine_id);
CREATE INDEX idx_start_time ON maintenance_records (start_time);


-- 9. PREDICTION RESULTS TABLE
CREATE TABLE prediction_results (
                                    prediction_id SERIAL PRIMARY KEY,
                                    machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
                                    prediction_type VARCHAR(50),
                                    predicted_value DECIMAL(5,2),
                                    confidence_score DECIMAL(5,2),
                                    prediction_timestamp TIMESTAMP,
                                    model_version VARCHAR(50),
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prediction_machine_id ON prediction_results (machine_id);
CREATE INDEX idx_prediction_type ON prediction_results (prediction_type);
CREATE INDEX idx_prediction_timestamp ON prediction_results (prediction_timestamp);


-- 10. ANALYTICS AGGREGATE TABLE (for performance)
CREATE TABLE analytics_daily_summary (
                                         summary_id SERIAL PRIMARY KEY,
                                         machine_id INTEGER NOT NULL REFERENCES machines(machine_id),
                                         summary_date DATE NOT NULL,
                                         uptime_percentage DECIMAL(5,2),
                                         downtime_minutes INTEGER,
                                         idle_minutes INTEGER,
                                         jobs_completed INTEGER,
                                         total_runtime_hours DECIMAL(10,2),
                                         failures_count INTEGER,
                                         tools_replaced INTEGER,
                                         total_cost DECIMAL(10,2),
                                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                         UNIQUE(machine_id, summary_date)
);

CREATE INDEX idx_machine_date ON analytics_daily_summary (machine_id, summary_date);


-- Create indexes for common queries
CREATE INDEX idx_metrics_temp_time ON machine_metrics(machine_id, timestamp DESC);
CREATE INDEX idx_jobs_machine_status ON production_jobs(status);
CREATE INDEX idx_alerts_unacknowledged ON alerts(machine_id) WHERE is_acknowledged = FALSE;
