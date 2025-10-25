-- Migration: Add gender column to students and employees
-- Date: 2025-10-24
-- Description: Add gender field (MALE/FEMALE) to student and employee records

-- Add gender column to students table
ALTER TABLE student.students
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add gender column to employees table  
ALTER TABLE hr.employees
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add check constraint for students gender
ALTER TABLE student.students
DROP CONSTRAINT IF EXISTS students_gender_check;

ALTER TABLE student.students
ADD CONSTRAINT students_gender_check 
CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'));

-- Add check constraint for employees gender
ALTER TABLE hr.employees
DROP CONSTRAINT IF EXISTS employees_gender_check;

ALTER TABLE hr.employees
ADD CONSTRAINT employees_gender_check 
CHECK (gender IS NULL OR gender IN ('MALE', 'FEMALE'));
