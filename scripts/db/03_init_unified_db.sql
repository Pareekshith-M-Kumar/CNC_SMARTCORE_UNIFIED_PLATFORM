-- ============================================================================
-- DATABASE 3: cnc_unified_db (Unified Platform Identity & Core Lifecycle Database)
-- Dedicated to: User Registrations, Credentials, Roles, Orders, Shipments, Assets
-- ============================================================================

-- User registration & credential storage
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, -- bcrypt hashed password
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator', -- designer, cam_engineer, approver, operator, customer, admin
    is_active BOOLEAN DEFAULT TRUE,
    email_confirmed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_sign_in TIMESTAMP WITH TIME ZONE
);

-- Public profile metadata mirror
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'operator',
    department VARCHAR(100) DEFAULT 'Manufacturing',
    phone_number VARCHAR(30),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturing Orders (linking approved plans to customer orders)
CREATE TABLE IF NOT EXISTS manufacturing_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. MO-2026-1001
    approval_id UUID NOT NULL, -- references approval in M2
    customer_id UUID REFERENCES users(id),
    status VARCHAR(30) DEFAULT 'CONFIRMED', -- CONFIRMED, IN_PRODUCTION, RELEASED, COMPLETED
    quantity INT DEFAULT 1,
    customer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Shipments with strict state-machine enforcement
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_number VARCHAR(50) NOT NULL UNIQUE, -- e.g. SHP-2026-1001
    order_id UUID REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100) DEFAULT 'FastFreight Air Cargo',
    status VARCHAR(30) DEFAULT 'PREPARING', -- PREPARING -> SHIPPED -> IN_TRANSIT -> DELIVERED
    dispatched_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shipment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    previous_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    event_notes TEXT,
    actor_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Physical Registered Assets with permanent cryptographic plan_hash
CREATE TABLE IF NOT EXISTS physical_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag VARCHAR(50) NOT NULL UNIQUE, -- e.g. ASSET-000123
    order_id UUID REFERENCES manufacturing_orders(id),
    plan_hash VARCHAR(64) NOT NULL, -- Immutable SHA-256 Provenance Fingerprint
    status VARCHAR(30) DEFAULT 'REGISTERED', -- REGISTERED, VERIFIED, DEPLOYED
    machine_code VARCHAR(50), -- Bound to Module 1 machine (CNC-001)
    registered_by UUID REFERENCES users(id),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- System-wide audit log
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    actor_id UUID REFERENCES users(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50),
    request_id VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Master Administrator and Default Roles
-- Password for Pareekshith / admin accounts: Pareekshith (bcrypt hashed)
-- bcrypt hash for 'Pareekshith' with salt 10 rounds:
-- $2a$10$7v1aE3XkQ2K9u9tLkJ8yieK6l3N0yXl1tqFv7L0K1Y2e5e4K3G2a
INSERT INTO users (id, email, password_hash, full_name, role, is_active, email_confirmed)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'cnc@gmail.com', '$2a$10$7v1aE3XkQ2K9u9tLkJ8yieK6l3N0yXl1tqFv7L0K1Y2e5e4K3G2a', 'Pareekshith M Kumar (Admin)', 'admin', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000002', 'designer@cncsmartcore.local', '$2a$10$7v1aE3XkQ2K9u9tLkJ8yieK6l3N0yXl1tqFv7L0K1Y2e5e4K3G2a', 'Lead CAD Designer', 'designer', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000003', 'cam@cncsmartcore.local', '$2a$10$7v1aE3XkQ2K9u9tLkJ8yieK6l3N0yXl1tqFv7L0K1Y2e5e4K3G2a', 'CAM Toolpath Engineer', 'cam_engineer', TRUE, TRUE),
    ('00000000-0000-0000-0000-000000000004', 'operator@cncsmartcore.local', '$2a$10$7v1aE3XkQ2K9u9tLkJ8yieK6l3N0yXl1tqFv7L0K1Y2e5e4K3G2a', 'CNC Machinist Operator', 'operator', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO profiles (id, email, full_name, role, department, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'cnc@gmail.com', 'Pareekshith M Kumar (Admin)', 'admin', 'Management', TRUE),
    ('00000000-0000-0000-0000-000000000002', 'designer@cncsmartcore.local', 'Lead CAD Designer', 'designer', 'Product Design', TRUE),
    ('00000000-0000-0000-0000-000000000003', 'cam@cncsmartcore.local', 'CAM Toolpath Engineer', 'cam_engineer', 'Manufacturing Engineering', TRUE),
    ('00000000-0000-0000-0000-000000000004', 'operator@cncsmartcore.local', 'CNC Machinist Operator', 'operator', 'Shop Floor Operations', TRUE)
ON CONFLICT (id) DO NOTHING;
