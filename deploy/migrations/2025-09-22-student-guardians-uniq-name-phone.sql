-- Enforce no duplicate guardians by name + phone among active (not deleted) records
-- Uses a functional index on lower(full_name) and phone, filtered by is_deleted = false
-- Safe to run multiple times
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'student' AND indexname = 'uq_guardians_name_phone_active'
    ) THEN
        EXECUTE 'CREATE UNIQUE INDEX uq_guardians_name_phone_active
                 ON student.guardians ((lower(full_name)), phone)
                 WHERE is_deleted = false';
    END IF;
END$$;
