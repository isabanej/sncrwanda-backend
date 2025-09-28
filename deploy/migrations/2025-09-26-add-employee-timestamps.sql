-- Migration: Add created_at and updated_at timestamps to employees
-- Date: 2025-09-26

ALTER TABLE hr.employees
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_employees_created_at ON hr.employees(created_at);

-- Backfill updated_at with created_at for existing rows (optional consistency)
UPDATE hr.employees SET updated_at = created_at WHERE updated_at IS NULL;
