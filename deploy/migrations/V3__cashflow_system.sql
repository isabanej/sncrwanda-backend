-- ============================================================================
-- SNC Rwanda Cashflow System - Database Schema
-- Migration Version: V3
-- Created: October 23, 2025
-- Description: Monthly cashflow recording system with time-locking,
--              edit tracking, and petty cash management
-- ============================================================================

-- ============================================================================
-- 1. EXPENSE CATEGORIES (Predefined + User-added)
-- ============================================================================
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    is_system_defined BOOLEAN DEFAULT false,
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    org_id UUID NOT NULL,
    UNIQUE(category_name, org_id)
);

-- Seed predefined expense categories
INSERT INTO expense_categories (category_name, is_system_defined, display_order, org_id) VALUES
('Rent', true, 1, '00000000-0000-0000-0000-000000000001'),
('Training', true, 2, '00000000-0000-0000-0000-000000000001'),
('Equipment', true, 3, '00000000-0000-0000-0000-000000000001'),
('Food Costs', true, 4, '00000000-0000-0000-0000-000000000001'),
('Advertising', true, 5, '00000000-0000-0000-0000-000000000001'),
('Insurance liability', true, 6, '00000000-0000-0000-0000-000000000001'),
('Professional Services / intern', true, 7, '00000000-0000-0000-0000-000000000001'),
('Office Supplies', true, 8, '00000000-0000-0000-0000-000000000001'),
('Website', true, 9, '00000000-0000-0000-0000-000000000001'),
('Repair / Maint.', true, 10, '00000000-0000-0000-0000-000000000001'),
('Supplies', true, 11, '00000000-0000-0000-0000-000000000001'),
('Travel', true, 12, '00000000-0000-0000-0000-000000000001'),
('Therapists', true, 13, '00000000-0000-0000-0000-000000000001'),
('Business Phone', true, 14, '00000000-0000-0000-0000-000000000001'),
('Staff Wages', true, 15, '00000000-0000-0000-0000-000000000001'),
('Staff Ovhd (tax, LNI, etc.)', true, 16, '00000000-0000-0000-0000-000000000001'),
('Business Taxes (est.)', true, 17, '00000000-0000-0000-0000-000000000001'),
('Others', true, 18, '00000000-0000-0000-0000-000000000001');

CREATE INDEX idx_expense_categories_active ON expense_categories(is_active, display_order);


-- ============================================================================
-- 2. CASHFLOW PERIODS (Monthly tracking with time-locking)
-- ============================================================================
CREATE TABLE cashflow_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    period_name VARCHAR(50) NOT NULL,
    
    -- Cash balances (in RWF)
    beginning_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    ending_cash DECIMAL(15,2) NOT NULL DEFAULT 0,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'LATE_ENTRY_PERIOD', 'LOCKED')),
    locked_date TIMESTAMP,
    late_entry_deadline TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    org_id UUID NOT NULL,
    
    UNIQUE(year, month, org_id)
);

CREATE INDEX idx_cashflow_periods_status ON cashflow_periods(status, year, month);
CREATE INDEX idx_cashflow_periods_org ON cashflow_periods(org_id, year DESC, month DESC);


-- ============================================================================
-- 3. CASH IN (Income tracking)
-- ============================================================================
CREATE TABLE cashflow_cash_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- Cash IN categories (in RWF)
    school_fees_total DECIMAL(15,2) DEFAULT 0,
    other_cash_in DECIMAL(15,2) DEFAULT 0,
    other_cash_in_notes TEXT,
    petty_cash_in DECIMAL(15,2) DEFAULT 0,
    petty_cash_in_notes TEXT,
    
    -- Total (calculated)
    total_cash_in DECIMAL(15,2) GENERATED ALWAYS AS 
        (COALESCE(school_fees_total, 0) + COALESCE(other_cash_in, 0) + COALESCE(petty_cash_in, 0)) STORED,
    
    -- Edit tracking for one-time entries
    school_fees_edit_count INTEGER DEFAULT 0,
    school_fees_last_edit TIMESTAMP,
    other_cash_edit_count INTEGER DEFAULT 0,
    other_cash_last_edit TIMESTAMP,
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    org_id UUID NOT NULL,
    
    UNIQUE(period_id)
);

CREATE INDEX idx_cashflow_cash_in_period ON cashflow_cash_in(period_id);


-- ============================================================================
-- 4. STUDENT FEE PAYMENTS (One per student per month, max 3 edits)
-- ============================================================================
CREATE TABLE student_fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    
    -- Student info (cached for reporting)
    student_name VARCHAR(255) NOT NULL,
    fee_type VARCHAR(100),
    
    -- Payment details (in RWF)
    amount_paid DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    receipt_number VARCHAR(100),
    notes TEXT,
    
    -- Edit tracking (max 3 attempts)
    edit_count INTEGER DEFAULT 0,
    edit_attempts_remaining INTEGER DEFAULT 3,
    last_edited TIMESTAMP,
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL,
    
    -- Ensure one payment per student per month
    UNIQUE(period_id, student_id)
);

CREATE INDEX idx_student_fee_payments_period ON student_fee_payments(period_id);
CREATE INDEX idx_student_fee_payments_student ON student_fee_payments(student_id);
CREATE INDEX idx_student_fee_payments_late ON student_fee_payments(is_late_entry);


-- ============================================================================
-- 5. STAFF PAYROLL (One per employee per month, max 3 edits)
-- ============================================================================
CREATE TABLE staff_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    
    -- Employee info (cached)
    employee_name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    
    -- Salary details (in RWF)
    base_salary DECIMAL(15,2) NOT NULL,
    bonuses DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) GENERATED ALWAYS AS 
        (base_salary + COALESCE(bonuses, 0) - COALESCE(deductions, 0)) STORED,
    
    -- Payment details
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    
    -- Edit tracking (max 3 attempts)
    edit_count INTEGER DEFAULT 0,
    edit_attempts_remaining INTEGER DEFAULT 3,
    last_edited TIMESTAMP,
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL,
    
    -- Ensure one payroll entry per employee per month
    UNIQUE(period_id, employee_id)
);

CREATE INDEX idx_staff_payroll_period ON staff_payroll(period_id);
CREATE INDEX idx_staff_payroll_employee ON staff_payroll(employee_id);
CREATE INDEX idx_staff_payroll_late ON staff_payroll(is_late_entry);


-- ============================================================================
-- 6. CASHFLOW EXPENSES (Multiple entries allowed)
-- ============================================================================
CREATE TABLE cashflow_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- Expense category
    category VARCHAR(100) NOT NULL,
    
    -- Expense details (in RWF)
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    receipt_number VARCHAR(100),
    payment_method VARCHAR(50),
    vendor_name VARCHAR(255),
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL
);

CREATE INDEX idx_cashflow_expenses_period ON cashflow_expenses(period_id);
CREATE INDEX idx_cashflow_expenses_category ON cashflow_expenses(category);
CREATE INDEX idx_cashflow_expenses_date ON cashflow_expenses(transaction_date);
CREATE INDEX idx_cashflow_expenses_late ON cashflow_expenses(is_late_entry);


-- ============================================================================
-- 7. PETTY CASH TRANSACTIONS (IN/OUT tracking)
-- ============================================================================
CREATE TABLE petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- Transaction type
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('IN', 'OUT')),
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    
    -- Details
    category VARCHAR(100),
    description TEXT,
    receipt_number VARCHAR(100),
    handled_by VARCHAR(255),
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL
);

CREATE INDEX idx_petty_cash_period ON petty_cash_transactions(period_id);
CREATE INDEX idx_petty_cash_type ON petty_cash_transactions(transaction_type);
CREATE INDEX idx_petty_cash_date ON petty_cash_transactions(transaction_date);


-- ============================================================================
-- 8. PETTY CASH SUMMARY (Per period balance tracking)
-- ============================================================================
CREATE TABLE petty_cash_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID NOT NULL REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- Balance tracking (in RWF)
    opening_balance DECIMAL(15,2) DEFAULT 0,
    total_in DECIMAL(15,2) DEFAULT 0,
    total_out DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) GENERATED ALWAYS AS 
        (opening_balance + COALESCE(total_in, 0) - COALESCE(total_out, 0)) STORED,
    
    -- Carry forward status
    carried_forward DECIMAL(15,2),
    carried_forward_date TIMESTAMP,
    
    org_id UUID NOT NULL,
    
    UNIQUE(period_id)
);

CREATE INDEX idx_petty_cash_summary_period ON petty_cash_summary(period_id);


-- ============================================================================
-- 9. AUDIT LOG (Track all changes for compliance)
-- ============================================================================
CREATE TABLE cashflow_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- What changed
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL,
    
    -- Changes
    old_value JSONB,
    new_value JSONB,
    
    -- Who and when
    changed_by UUID,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    
    org_id UUID NOT NULL
);

CREATE INDEX idx_audit_log_period ON cashflow_audit_log(period_id);
CREATE INDEX idx_audit_log_entity ON cashflow_audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_date ON cashflow_audit_log(changed_at);


-- ============================================================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for cashflow_periods
CREATE TRIGGER update_cashflow_periods_updated
    BEFORE UPDATE ON cashflow_periods
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();

-- Trigger for cashflow_cash_in
CREATE TRIGGER update_cashflow_cash_in_updated
    BEFORE UPDATE ON cashflow_cash_in
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();


-- Function to update petty cash summary
CREATE OR REPLACE FUNCTION update_petty_cash_summary()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate totals from transactions
    UPDATE petty_cash_summary
    SET 
        total_in = COALESCE((
            SELECT SUM(amount)
            FROM petty_cash_transactions
            WHERE period_id = NEW.period_id 
            AND transaction_type = 'IN'
        ), 0),
        total_out = COALESCE((
            SELECT SUM(amount)
            FROM petty_cash_transactions
            WHERE period_id = NEW.period_id 
            AND transaction_type = 'OUT'
        ), 0)
    WHERE period_id = NEW.period_id;
    
    -- Create summary if doesn't exist
    IF NOT FOUND THEN
        INSERT INTO petty_cash_summary (period_id, org_id, opening_balance, total_in, total_out)
        VALUES (
            NEW.period_id,
            NEW.org_id,
            0,
            CASE WHEN NEW.transaction_type = 'IN' THEN NEW.amount ELSE 0 END,
            CASE WHEN NEW.transaction_type = 'OUT' THEN NEW.amount ELSE 0 END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for petty cash transactions
CREATE TRIGGER update_petty_cash_summary_trigger
    AFTER INSERT OR UPDATE OR DELETE ON petty_cash_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_petty_cash_summary();


-- ============================================================================
-- 11. VIEWS FOR REPORTING
-- ============================================================================

-- View: Monthly cashflow summary
CREATE VIEW v_monthly_cashflow_summary AS
SELECT 
    p.id as period_id,
    p.year,
    p.month,
    p.period_name,
    p.beginning_cash,
    p.ending_cash,
    p.status,
    
    -- Cash IN
    COALESCE(ci.school_fees_total, 0) as school_fees,
    COALESCE(ci.other_cash_in, 0) as other_cash_in,
    COALESCE(ci.total_cash_in, 0) as total_cash_in,
    
    -- Cash OUT
    COALESCE(SUM(e.amount), 0) as total_expenses,
    COALESCE(SUM(sp.net_salary), 0) as total_payroll,
    
    -- Petty Cash
    COALESCE(pcs.opening_balance, 0) as petty_cash_opening,
    COALESCE(pcs.closing_balance, 0) as petty_cash_closing,
    
    -- Calculated
    p.beginning_cash + COALESCE(ci.total_cash_in, 0) as cash_available,
    p.ending_cash - p.beginning_cash as net_change
    
FROM cashflow_periods p
LEFT JOIN cashflow_cash_in ci ON p.id = ci.period_id
LEFT JOIN cashflow_expenses e ON p.id = e.period_id
LEFT JOIN staff_payroll sp ON p.id = sp.period_id
LEFT JOIN petty_cash_summary pcs ON p.id = pcs.period_id
GROUP BY p.id, p.year, p.month, p.period_name, p.beginning_cash, p.ending_cash, p.status,
         ci.school_fees_total, ci.other_cash_in, ci.total_cash_in,
         pcs.opening_balance, pcs.closing_balance;


-- View: Late entries report
CREATE VIEW v_late_entries_report AS
SELECT 
    p.year,
    p.month,
    p.period_name,
    'Student Fee' as entry_type,
    sfp.student_name as entity_name,
    sfp.amount_paid as amount,
    sfp.recorded_at,
    sfp.recorded_by
FROM student_fee_payments sfp
JOIN cashflow_periods p ON sfp.period_id = p.id
WHERE sfp.is_late_entry = true

UNION ALL

SELECT 
    p.year,
    p.month,
    p.period_name,
    'Payroll' as entry_type,
    sp.employee_name as entity_name,
    sp.net_salary as amount,
    sp.recorded_at,
    sp.recorded_by
FROM staff_payroll sp
JOIN cashflow_periods p ON sp.period_id = p.id
WHERE sp.is_late_entry = true

UNION ALL

SELECT 
    p.year,
    p.month,
    p.period_name,
    'Expense' as entry_type,
    e.category as entity_name,
    e.amount,
    e.recorded_at,
    e.recorded_by
FROM cashflow_expenses e
JOIN cashflow_periods p ON e.period_id = p.id
WHERE e.is_late_entry = true

ORDER BY year DESC, month DESC, recorded_at DESC;


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 9
-- Indexes created: 24
-- Functions created: 2
-- Triggers created: 3
-- Views created: 2
-- 
-- Next steps:
-- 1. Create Java domain entities
-- 2. Create Spring Data repositories
-- 3. Build service layer
-- ============================================================================
