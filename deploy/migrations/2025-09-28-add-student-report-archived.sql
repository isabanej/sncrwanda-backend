-- Migration: Add archived column to student.student_reports
-- Reason: JPA entity StudentReport includes a non-null 'archived' boolean field
--         and repository/service methods query on it (findByArchived / findByBranchIdAndArchived).
--         The physical table currently lacks this column, causing empty results or SQL errors
--         when those methods are invoked. This migration aligns the schema.

ALTER TABLE student.student_reports
    ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Optional performance index if archived filtering becomes frequent.
-- (We already have branch_id index via JPA; composite can help combined filters.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_student_reports_branch_archived'
          AND n.nspname = 'student'
    ) THEN
        CREATE INDEX idx_student_reports_branch_archived ON student.student_reports (branch_id, archived);
    END IF;
END$$;

-- Verification query (run manually):
--   SELECT id, archived FROM student.student_reports LIMIT 5;
-- Expected: existing rows show archived = false.

-- Rollback (manual):
--   ALTER TABLE student.student_reports DROP COLUMN archived;
