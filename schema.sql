CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS sales_logs;
DROP TABLE IF EXISTS monthly_targets;
DROP TABLE IF EXISTS model_overrides;
DROP TABLE IF EXISTS incentive_slabs;
DROP TABLE IF EXISTS slab_schemes;
DROP TABLE IF EXISTS cars;
DROP TABLE IF EXISTS users;


CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(256) NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'SALES_OFFICER')),
  email VARCHAR(100),
  active BOOLEAN DEFAULT TRUE,
  employee_id VARCHAR(50) UNIQUE,
  branch_code VARCHAR(20),
  reporting_manager VARCHAR(100),
  date_of_joining DATE,
  designation VARCHAR(50),
  contact_number VARCHAR(20),
  deactivation_reason VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(100) NOT NULL,
  base_suffix VARCHAR(50) NOT NULL,
  variant VARCHAR(50) NOT NULL,
  ex_showroom_price VARCHAR(20),
  segment VARCHAR(50) NOT NULL CHECK (segment IN ('SUV', 'MUV', 'Sedan', 'Hatchback', 'Pickup')),
  launch_status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (launch_status IN ('ACTIVE', 'DISCONTINUED', 'UPCOMING')),
  eligible_for_incentive BOOLEAN DEFAULT TRUE NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE slab_schemes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  activation_date DATE NOT NULL,
  target_bonus_type VARCHAR(20) DEFAULT 'NONE' NOT NULL CHECK (target_bonus_type IN ('FLAT', 'PER_CAR', 'NONE')),
  target_bonus_amount DECIMAL(12, 2) DEFAULT 0.00 NOT NULL CHECK (target_bonus_amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE incentive_slabs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES slab_schemes(id) ON DELETE CASCADE,
  min_volume INTEGER NOT NULL CHECK (min_volume >= 0),
  max_volume INTEGER,
  payout_per_car DECIMAL(12, 2) NOT NULL CHECK (payout_per_car >= 0),
  label VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE model_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scheme_id UUID NOT NULL REFERENCES slab_schemes(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  override_type VARCHAR(20) NOT NULL CHECK (override_type IN ('FLAT', 'BONUS')),
  amount DECIMAL(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_scheme_car UNIQUE (scheme_id, car_id)
);


CREATE TABLE monthly_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  target_volume INTEGER NOT NULL CHECK (target_volume >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_month_target UNIQUE (user_id, month)
);


CREATE TABLE sales_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  volume INTEGER NOT NULL CHECK (volume >= 0),
  month VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_car_month UNIQUE (user_id, car_id, month)
);


CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE INDEX idx_sales_logs_user_month ON sales_logs(user_id, month);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_cars_active ON cars(active);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);


ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE cars DISABLE ROW LEVEL SECURITY;
ALTER TABLE incentive_slabs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE announcements DISABLE ROW LEVEL SECURITY;









INSERT INTO users (id, username, password_hash, name, role, email, employee_id, branch_code, reporting_manager, date_of_joining, designation, contact_number) VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'admin',    '$2a$10$tzyjnfufiJBt2X4j9AfzO.H4hphhyM2GHKMSBlUCa/Kg30Floppii', 'Dealership Admin',          'ADMIN',          'admin@nippont.com', 'TKM-2022-001', 'BR-01', 'TKM HQ', '2022-01-01', 'System Admin', '9876543210'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'officer1', '$2a$10$LzFXb35yVO2Di28.PoFps.wlge1y1mX.B6./vQhUstrMUG6F8YOa6', 'Rahul Sharma',              'SALES_OFFICER',  'rahul@nippont.com', 'TKM-2024-001', 'BR-01', 'Dealership Admin', '2024-06-01', 'Senior Executive', '9876543211'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'officer2', '$2a$10$LzFXb35yVO2Di28.PoFps.wlge1y1mX.B6./vQhUstrMUG6F8YOa6', 'Priya Menon',               'SALES_OFFICER',  'priya@nippont.com', 'TKM-2024-002', 'BR-01', 'Dealership Admin', '2024-10-01', 'Associate Officer', '9876543212');


INSERT INTO cars (model_name, base_suffix, variant, ex_showroom_price, segment, launch_status, eligible_for_incentive, active) VALUES
  ('Glanza',               'V',         'Petrol AMT',       '₹10.42L',  'Hatchback', 'ACTIVE', TRUE, TRUE),
  ('Urban Cruiser Hyryder','S+',        'Strong Hybrid',    '₹16.73L',  'SUV',       'ACTIVE', TRUE, TRUE),
  ('Rumion',               'V',         'Petrol MT',        '₹11.69L',  'MUV',       'ACTIVE', TRUE, TRUE),
  ('Innova Crysta',        'VX',        'Diesel MT',        '₹21.34L',  'MUV',       'ACTIVE', TRUE, TRUE),
  ('Innova Hycross',       'ZX(O)',     'Strong Hybrid',    '₹30.98L',  'MUV',       'ACTIVE', TRUE, TRUE),
  ('Fortuner',             'Legender',  'Diesel 4x4 AT',   '₹45.87L',  'SUV',       'ACTIVE', TRUE, TRUE),
  ('Camry',                'Elegant',   'Hybrid',           '₹48.25L',  'Sedan',     'ACTIVE', TRUE, TRUE),
  ('Hilux',                'High',      'Diesel 4x4 AT',   '₹37.90L',  'Pickup',    'ACTIVE', TRUE, TRUE);


INSERT INTO slab_schemes (id, name, activation_date, target_bonus_type, target_bonus_amount) VALUES
  ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Q2 FY2026 Scheme', '2026-04-01', 'FLAT', 10000.00);

INSERT INTO monthly_targets (user_id, month, target_volume) VALUES
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '2026-06', 4),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', '2026-06', 2);


INSERT INTO incentive_slabs (scheme_id, min_volume, max_volume, payout_per_car, label) VALUES
  ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 1,  3,    800,  'Base Tier'),
  ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 4,  7,    1500, 'Silver Tier'),
  ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 8,  12,   2500, 'Gold Tier'),
  ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 13, 20,   4000, 'Platinum Tier'),
  ('d1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 21, NULL, 6000, 'Diamond Tier');


INSERT INTO audit_logs (action, details) VALUES 
  ('SYSTEM_INIT', 'Toyota Dealership SQL Schemas successfully loaded and initialized.');


INSERT INTO announcements (title, content) VALUES
  ('Toyota India Payout Campaign', 'Dynamic commission ranges updated for Q2. Sell more hybrid models to achieve higher commission slabs.'),
  ('Dynamic Incentive Slabs Active', 'Nippon Toyota''s 5-tier dynamic commission program is active. Ensure all showroom logs are updated before June 1st, 10 PM IST.');
