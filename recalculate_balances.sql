-- Recalculate ending cash for all periods
UPDATE ledger.cashflow_periods p
SET ending_cash = (
    -- Beginning cash
    COALESCE(p.beginning_cash, 0)
    -- Plus: Student fees
    + COALESCE((
        SELECT SUM(amount_paid)
        FROM ledger.student_fee_payments
        WHERE period_id = p.id
    ), 0)
    -- Plus: Petty cash IN
    + COALESCE((
        SELECT SUM(amount)
        FROM ledger.petty_cash_transactions
        WHERE period_id = p.id AND transaction_type = 'IN'
    ), 0)
    -- Minus: Expenses
    - COALESCE((
        SELECT SUM(amount)
        FROM ledger.cashflow_expenses
        WHERE period_id = p.id
    ), 0)
    -- Minus: Petty cash OUT
    - COALESCE((
        SELECT SUM(amount)
        FROM ledger.petty_cash_transactions
        WHERE period_id = p.id AND transaction_type = 'OUT'
    ), 0)
);

-- Show results
SELECT 
    TO_CHAR(DATE_TRUNC('month', MAKE_DATE(year, month, 1)), 'Mon YYYY') as period,
    beginning_cash,
    (SELECT COALESCE(SUM(amount_paid), 0) FROM ledger.student_fee_payments WHERE period_id = p.id) as fees,
    (SELECT COALESCE(SUM(amount), 0) FROM ledger.petty_cash_transactions WHERE period_id = p.id AND transaction_type = 'IN') as petty_in,
    (SELECT COALESCE(SUM(amount), 0) FROM ledger.cashflow_expenses WHERE period_id = p.id) as expenses,
    (SELECT COALESCE(SUM(amount), 0) FROM ledger.petty_cash_transactions WHERE period_id = p.id AND transaction_type = 'OUT') as petty_out,
    ending_cash
FROM ledger.cashflow_periods p
ORDER BY year, month;
