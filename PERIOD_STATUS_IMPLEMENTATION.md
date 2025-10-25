# Cashflow Period Status Implementation

## Summary of Changes

This implementation enhances the cashflow period management system to properly differentiate between past periods (CLOSED) and future periods (LOCKED), while maintaining the 5-day grace period for late entries.

## Period Status Rules

### Status Types
1. **OPEN**: Current month - users can record entries freely
2. **LATE_ENTRY_PERIOD**: Previous month within 5 days after month-end - users can still record entries but they're marked as late
3. **CLOSED**: Past months (after 5-day grace period) - read-only, cannot add/edit
4. **LOCKED**: Future months - read-only, cannot add/edit

### Status Logic
- **Current Month** (Oct 2025): Always **OPEN**
- **Previous Month** (Sept 2025): 
  - First 5 days of current month: **LATE_ENTRY_PERIOD**
  - After 5 days: **CLOSED**
- **Past Months** (Aug 2025 and earlier): Always **CLOSED**
- **Future Months** (Nov 2025 and later): Always **LOCKED**

## Backend Changes

### 1. Domain Model (`CashflowPeriod.java`)
**File**: `ledger-service/src/main/java/org/sncrwanda/ledger/domain/CashflowPeriod.java`

Added new `CLOSED` status to enum:
```java
public enum PeriodStatus {
    OPEN,              // Current month - can record freely
    LATE_ENTRY_PERIOD, // 1-5 days into next month - entries marked as late
    CLOSED,            // Past periods (after 5 days) - cannot add/edit
    LOCKED             // Future periods - cannot add/edit
}
```

### 2. Period Service (`CashflowPeriodService.java`)
**File**: `ledger-service/src/main/java/org/sncrwanda/ledger/service/CashflowPeriodService.java`

#### Updated `determineInitialStatus()` method:
- Returns `OPEN` for current month
- Returns `LATE_ENTRY_PERIOD` for previous month within 5 days
- Returns `CLOSED` for past months (changed from `LOCKED`)
- Returns `LOCKED` for future months only

#### Updated `updatePeriodStatuses()` scheduled job:
- Changed to set past periods to `CLOSED` instead of `LOCKED`
- Maintains same logic for transitioning OPEN → LATE_ENTRY_PERIOD → CLOSED

## Frontend Changes

### 1. Cashflow Page (`Cashflow.tsx`)
**File**: `frontend-new/src/pages/Cashflow.tsx`

#### Updated Status Badge:
```typescript
const getStatusBadge = (status: string) => {
  const badges = {
    OPEN: { class: 'badge-success', text: 'Open' },
    LATE_ENTRY_PERIOD: { class: 'badge-warning', text: 'Late Entry Period' },
    CLOSED: { class: 'badge-secondary', text: 'Closed' },
    LOCKED: { class: 'badge-danger', text: 'Locked' },
  };
  // ...
};
```

#### Added Period Grouping by Year:
```typescript
// Group periods by year
const periodsByYear = periods.reduce((acc, period) => {
  const year = period.periodName.split(' ')[1]; // Extract year from "Jan 2025"
  if (!acc[year]) {
    acc[year] = [];
  }
  acc[year].push(period);
  return acc;
}, {} as Record<string, CashflowPeriod[]>);

// Sort years descending
const sortedYears = Object.keys(periodsByYear).sort((a, b) => parseInt(b) - parseInt(a));
```

#### Updated Dropdown with Year Groups:
```typescript
<select className="form-control period-select" ...>
  {sortedYears.map(year => (
    <optgroup key={year} label={year}>
      {periodsByYear[year].map(period => (
        <option key={period.id} value={period.id}>
          {period.periodName} - {getStatusBadge(period.status).props.children}
        </option>
      ))}
    </optgroup>
  ))}
</select>
```

## Database Migration

### Migration File: `2025-10-24-add-closed-period-status.sql`
**File**: `deploy/migrations/2025-10-24-add-closed-period-status.sql`

```sql
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
```

## Current Period Status (Oct 24, 2025)

```
📊 Status Summary:
   CLOSED: 9   (Jan 2025 - Sept 2025)
   OPEN: 1     (Oct 2025 - Current Month)
   LOCKED: 14  (Nov 2025 - Dec 2026)
```

## User Experience

### Period Dropdown Display
Periods are now organized by year in descending order:

```
┌─────────────────────────────────────┐
│ 2026                                │
│   Dec 2026 - Locked                 │
│   Nov 2026 - Locked                 │
│   ...                               │
├─────────────────────────────────────┤
│ 2025                                │
│   Dec 2025 - Locked                 │
│   Nov 2025 - Locked                 │
│ ► Oct 2025 - Open     ✅ (Current)  │
│   Sept 2025 - Closed                │
│   Aug 2025 - Closed                 │
│   ...                               │
└─────────────────────────────────────┘
```

### Status Indicators
- 🟢 **Open** (Green badge): Current month - full editing access
- 🟡 **Late Entry Period** (Yellow badge): Previous month (first 5 days) - editing with late entry warning
- ⚫ **Closed** (Gray badge): Past months - read-only
- 🔴 **Locked** (Red badge): Future months - read-only

## Testing

All changes have been tested and verified:
1. ✅ Database constraint updated successfully
2. ✅ Backend compiled without errors
3. ✅ Frontend built successfully
4. ✅ Period statuses correctly set in database
5. ✅ Current month (Oct 2025) is OPEN
6. ✅ Past months are CLOSED
7. ✅ Future months are LOCKED

## Files Modified

### Backend
1. `ledger-service/src/main/java/org/sncrwanda/ledger/domain/CashflowPeriod.java`
2. `ledger-service/src/main/java/org/sncrwanda/ledger/service/CashflowPeriodService.java`

### Frontend
3. `frontend-new/src/pages/Cashflow.tsx`

### Database
4. `deploy/migrations/2025-10-24-add-closed-period-status.sql`

### Utilities (for migration)
5. `run_period_status_migration.py` (migration script)
6. `fix_current_period_status.py` (status fix script)
7. `verify_period_statuses.py` (verification script)
