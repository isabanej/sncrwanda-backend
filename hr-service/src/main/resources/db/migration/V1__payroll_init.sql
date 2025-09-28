-- Payroll schema migration
create table if not exists payroll_periods (
    id uuid primary key,
    year int not null,
    month int not null,
    branch_id uuid not null,
    status varchar(20) not null,
    created_at timestamptz not null,
    created_by uuid,
    approved_by uuid,
    approved_at timestamptz,
    paid_by uuid,
    paid_at timestamptz,
    constraint uk_payroll_period_branch_month unique (branch_id, year, month)
);

create index if not exists idx_payroll_period_branch on payroll_periods (branch_id);
create index if not exists idx_payroll_period_ym on payroll_periods (year, month);

create table if not exists payroll_entries (
    id uuid primary key,
    period_id uuid not null references payroll_periods(id) on delete cascade,
    employee_id uuid not null,
    branch_id uuid not null,
    gross_salary numeric(16,2) not null,
    allowances numeric(16,2) not null default 0,
    deductions numeric(16,2) not null default 0,
    net_pay numeric(16,2) not null default 0,
    notes varchar(500),
    paid boolean not null default false,
    paid_at timestamptz
);

create index if not exists idx_payroll_entry_period on payroll_entries (period_id);
create index if not exists idx_payroll_entry_employee on payroll_entries (employee_id);
create index if not exists idx_payroll_entry_branch on payroll_entries (branch_id);

create table if not exists payroll_lines (
    id uuid primary key,
    entry_id uuid not null references payroll_entries(id) on delete cascade,
    type varchar(20) not null,
    label varchar(100) not null,
    amount numeric(16,2) not null
);

create index if not exists idx_payroll_line_entry on payroll_lines (entry_id);

