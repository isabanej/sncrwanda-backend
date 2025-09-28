-- Adds archived soft-delete flag to student_reports
ALTER TABLE student.student_reports
    ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Optional: index to accelerate archived queries (branch + archived)
CREATE INDEX IF NOT EXISTS idx_student_reports_branch_archived ON student.student_reports (branch_id, archived);
