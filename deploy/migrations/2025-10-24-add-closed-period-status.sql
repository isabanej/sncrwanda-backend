-- Migration: Add CLOSED status to cashflow periods
-- Date: 2025-10-24
-- Description: Differentiate between CLOSED (past periods) and LOCKED (future periods)

-- Step 1: Drop the old check constraint
ALTER TABLE ledger.cashflow_periods 
DROP CONSTRAINT IF EXISTS cashflow_periods_status_check;

-- Step 2: Add new check constraint with CLOSED status
ALTER TABLE ledger.cashflow_periods 
ADD CONSTRAINT cashflow_periods_status_check 
CHECK (status IN ('OPEN', 'LATE_ENTRY_PERIOD', 'CLOSED', 'LOCKED'));

-- Step 3: Update existing LOCKED periods that are in the past to CLOSED
UPDATE ledger.cashflow_periods
SET status = 'CLOSED'
WHERE status = 'LOCKED'
  AND (year < EXTRACT(YEAR FROM CURRENT_DATE) 
       OR (year = EXTRACT(YEAR FROM CURRENT_DATE) AND month < EXTRACT(MONTH FROM CURRENT_DATE)));
