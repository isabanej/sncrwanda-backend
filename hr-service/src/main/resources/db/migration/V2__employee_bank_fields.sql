-- Add optional bank fields to employees
alter table if exists employees
  add column if not exists bank_name varchar(150),
  add column if not exists bank_account varchar(40);
