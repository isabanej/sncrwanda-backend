-- Employee soft delete metadata columns (align with guardian pattern)
ALTER TABLE hr.employees
    ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
    ADD COLUMN IF NOT EXISTS deleted_by uuid NULL,
    ADD COLUMN IF NOT EXISTS deleted_by_name varchar(255),
    ADD COLUMN IF NOT EXISTS deleted_by_phone varchar(50);

CREATE INDEX IF NOT EXISTS idx_employees_is_deleted ON hr.employees(is_deleted);
