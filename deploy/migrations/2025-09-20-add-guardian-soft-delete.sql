-- Add soft-delete and audit columns to guardians table in student schema
ALTER TABLE IF EXISTS student.guardians
    ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
    ADD COLUMN IF NOT EXISTS deleted_by_name varchar(255) NULL,
    ADD COLUMN IF NOT EXISTS deleted_by_phone varchar(255) NULL,
    ADD COLUMN IF NOT EXISTS created_at timestamptz NULL;

-- Optional: backfill existing rows as not deleted
UPDATE student.guardians SET is_deleted = false WHERE is_deleted IS NULL;