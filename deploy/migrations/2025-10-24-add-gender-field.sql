-- Migration: Add gender column to students, employees, and guardians
-- Date: 2025-10-24
-- Description: Add gender field (MALE/FEMALE) to student, employee, and guardian records

-- Add gender column to students table
ALTER TABLE students.students
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add gender column to employees table  
ALTER TABLE hr.employees
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add gender column to guardians table
ALTER TABLE students.guardians
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add check constraint for students gender
ALTER TABLE students.students
DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE students.students
ADD CONSTRAINT students_gender_check 
CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'));

-- Add check constraint for employees gender
ALTER TABLE hr.employees
DROP CONSTRAINT IF EXISTS employees_gender_check;

ALTER TABLE hr.employees
ADD CONSTRAINT employees_gender_check 
CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'));

-- Add check constraint for guardians gender
ALTER TABLE students.guardians
DROP CONSTRAINT IF EXISTS guardians_gender_check;

ALTER TABLE students.guardians
ADD CONSTRAINT guardians_gender_check 
CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'));
