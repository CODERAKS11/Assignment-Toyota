-- Supabase Database Schema
-- Smart Incentive Calculator with Dynamic Slab Engine
-- Copy and paste this into the Supabase SQL Editor to set up the database tables.

-- 1. Enable UUID Extension if not enabled
create extension if not exists "uuid-ossp";

-- 2. Drop existing tables if they exist (for clean setup)
drop table if exists sales_logs;
drop table if exists incentive_slabs;
drop table if exists cars;
drop table if exists users;

-- 3. Create Users Table
create table users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  password text not null, -- SHA-256 or bcrypt hashed password
  name text not null,
  role text not null check (role in ('ADMIN', 'SALES_OFFICER')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create Cars Table (Inventory)
create table cars (
  id uuid primary key default uuid_generate_v4(),
  model_name text not null,
  base_suffix text not null, -- e.g., "SE", "XLE", "Limited"
  variant text not null, -- e.g., "Hybrid", "Gas", "PHEV"
  active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create Incentive Slabs Table (Dynamic slabs configurator)
create table incentive_slabs (
  id uuid primary key default uuid_generate_v4(),
  min_volume integer not null check (min_volume >= 0),
  max_volume integer, -- NULL represents infinity (e.g. 8+)
  payout_per_car numeric(12, 2) not null check (payout_per_car >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create Sales Logs Table (Saves Sales volume of car models by user per month)
create table sales_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  car_id uuid not null references cars(id) on delete cascade,
  volume integer not null check (volume >= 0),
  month text not null, -- Format: "YYYY-MM" (e.g., "2026-05")
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_user_car_month unique (user_id, car_id, month)
);

-- 7. Add indexes for performance
create index idx_sales_logs_user_month on sales_logs(user_id, month);
create index idx_users_username on users(username);

-- 8. Seed Default Data (Admin & Sales Officer accounts, some Toyota Models, and Slabs)
-- Password for admin: admin123
-- Password for officer: sales123
-- Hashed passwords below are simple SHA-256 for local/mock demonstration consistency.
insert into users (id, username, password, name, role) values
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', 'Toyota Admin Portal', 'ADMIN'),
  ('b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', 'officer1', '9857d42cf38a0f0d235889ff22cb434e3416ffdf4fa87679cfb6fa0f19c99616', 'John Doe (Sales Officer)', 'SALES_OFFICER'),
  ('c3d4e5f6-a7b8-9c0d-1e2f-3a4b5c6d7e8f', 'officer2', '9857d42cf38a0f0d235889ff22cb434e3416ffdf4fa87679cfb6fa0f19c99616', 'Sarah Smith (Sales Officer)', 'SALES_OFFICER');

insert into cars (id, model_name, base_suffix, variant, active) values
  ('d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', 'Camry', 'SE', 'Hybrid', true),
  ('e5f6a7b8-c9d0-1e2f-3a4b-5c6d7e8f9a0b', 'RAV4', 'XLE', 'Hybrid', true),
  ('f6a7b8c9-d0e1-2f3a-4b5c-6d7e8f9a0b1c', 'Corolla', 'LE', 'Gas', true),
  ('a7b8c9d0-e1f2-3a4b-5c6d-7e8f9a0b1c2d', 'Highlander', 'Limited', 'PHEV', true);

insert into incentive_slabs (id, min_volume, max_volume, payout_per_car) values
  ('11111111-2222-3333-4444-555555555555', 1, 3, 1000.00),
  ('22222222-3333-4444-5555-666666666666', 4, 7, 2000.00),
  ('33333333-4444-5555-6666-777777777777', 8, null, 3500.00);
