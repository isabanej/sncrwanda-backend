-- Add employment start/end dates
alter table if exists employees
  add column if not exists start_date date,
  add column if not exists end_date date;
