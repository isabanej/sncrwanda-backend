-- Add audit timestamp columns to all tables
-- Created: 2025-10-19
-- Purpose: Track created_at, updated_at, deleted_at, restored_at for all records

-- =============================================
-- STUDENTS SCHEMA
-- =============================================

-- Add columns to students table
ALTER TABLE students.students 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP;

-- Add columns to guardians table
ALTER TABLE students.guardians 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP;

-- =============================================
-- HR SCHEMA
-- =============================================

-- Add columns to employees table
ALTER TABLE hr.employees 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP;

-- =============================================
-- AUTH SCHEMA
-- =============================================

-- Add columns to users table (if it doesn't have them already)
ALTER TABLE auth.users 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP;

-- =============================================
-- LEDGER SCHEMA
-- =============================================

-- Add columns to ledger_entries table
ALTER TABLE ledger.ledger_entries 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS restored_at TIMESTAMP;

-- =============================================
-- CREATE TRIGGERS FOR AUTOMATIC updated_at
-- =============================================

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Students table trigger
DROP TRIGGER IF EXISTS update_students_updated_at ON students.students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students.students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Guardians table trigger
DROP TRIGGER IF EXISTS update_guardians_updated_at ON students.guardians;
CREATE TRIGGER update_guardians_updated_at
    BEFORE UPDATE ON students.guardians
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Employees table trigger
DROP TRIGGER IF EXISTS update_employees_updated_at ON hr.employees;
CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON hr.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Users table trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON auth.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ledger entries table trigger
DROP TRIGGER IF EXISTS update_ledger_entries_updated_at ON ledger.ledger_entries;
CREATE TRIGGER update_ledger_entries_updated_at
    BEFORE UPDATE ON ledger.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- UPDATE EXISTING RECORDS
-- =============================================

-- Set created_at for existing students records (use current timestamp as fallback)
UPDATE students.students 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE students.guardians 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE hr.employees 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE auth.users 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE ledger.ledger_entries 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON COLUMN students.students.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN students.students.updated_at IS 'Timestamp when the record was last updated (auto-updated by trigger)';
COMMENT ON COLUMN students.students.deleted_at IS 'Timestamp when the record was soft deleted';
COMMENT ON COLUMN students.students.restored_at IS 'Timestamp when the record was restored after deletion';

COMMENT ON COLUMN students.guardians.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN students.guardians.updated_at IS 'Timestamp when the record was last updated (auto-updated by trigger)';
COMMENT ON COLUMN students.guardians.deleted_at IS 'Timestamp when the record was soft deleted';
COMMENT ON COLUMN students.guardians.restored_at IS 'Timestamp when the record was restored after deletion';

COMMENT ON COLUMN hr.employees.created_at IS 'Timestamp when the record was created';
COMMENT ON COLUMN hr.employees.updated_at IS 'Timestamp when the record was last updated (auto-updated by trigger)';
COMMENT ON COLUMN hr.employees.deleted_at IS 'Timestamp when the record was soft deleted';
COMMENT ON COLUMN hr.employees.restored_at IS 'Timestamp when the record was restored after deletion';
