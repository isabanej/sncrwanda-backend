-- Add soft-delete flag with default to existing rows
alter table if exists employees
  add column if not exists is_deleted boolean not null default false;
