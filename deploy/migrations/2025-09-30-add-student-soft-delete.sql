-- Migration: Add soft-delete metadata to student.students
-- Reason: Ensure student entity has is_deleted and related metadata columns to support soft-delete semantics.

ALTER TABLE student.students
    ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
    ADD COLUMN IF NOT EXISTS deleted_by_name varchar(255),
    ADD COLUMN IF NOT EXISTS deleted_by_phone varchar(50);

CREATE INDEX IF NOT EXISTS idx_students_is_deleted ON student.students(is_deleted);

-- Verification (manual): SELECT id, is_deleted FROM student.students LIMIT 5;
