-- Drop the obsolete address column from the students table in the student schema
-- Safe to run multiple times
ALTER TABLE IF EXISTS student.students
    DROP COLUMN IF EXISTS address;
