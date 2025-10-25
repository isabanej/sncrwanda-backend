# SNC Rwanda Cashflow System - ACTUAL Implementation Plan
## Real Monthly Cashflow Recording & Management

---

## 📊 CORRECTED UNDERSTANDING

### What This System Actually Is:
- **Real cashflow recording system** (not budget projections)
- **Monthly financial ledger** with rolling cash balances
- **Time-locked entries** to prevent backdating fraud
- **Grace period for late entries** (5 days with warnings)
- **One-time monthly entries** for fees and salaries
- **Cascading cash flow** (each month's ending = next month's beginning)

---

## 🗂️ DATABASE SCHEMA (Revised)

### 1. **Monthly Cashflow Periods**
```sql
CREATE TABLE cashflow_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL, -- 1-12
    period_name VARCHAR(50) NOT NULL, -- "September 2025"
    
    -- Cash balances
    beginning_cash DECIMAL(15,2) NOT NULL, -- From previous month's ending_cash
    ending_cash DECIMAL(15,2) NOT NULL,    -- Calculated from all entries
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN', -- OPEN, LOCKED, LATE_ENTRY_PERIOD
    locked_date TIMESTAMP,
    late_entry_deadline TIMESTAMP, -- 5 days into next month
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    org_id UUID NOT NULL,
    
    UNIQUE(year, month, org_id)
);
```

### 2. **Cash IN Entries**
```sql
CREATE TABLE cashflow_cash_in (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- Cash IN categories
    school_fees_total DECIMAL(15,2) DEFAULT 0, -- Auto-calculated from student_fee_payments
    other_cash_in DECIMAL(15,2) DEFAULT 0,     -- Sponsors, owner investment, etc.
    other_cash_in_notes TEXT,
    petty_cash_in DECIMAL(15,2) DEFAULT 0,
    petty_cash_in_notes TEXT,
    
    total_cash_in DECIMAL(15,2) GENERATED ALWAYS AS 
        (school_fees_total + other_cash_in + petty_cash_in) STORED,
    
    -- Edit tracking for one-time entries
    school_fees_edit_count INTEGER DEFAULT 0,
    school_fees_last_edit TIMESTAMP,
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL
);
```

### 3. **Student Fee Payments (Monthly)**
```sql
CREATE TABLE student_fee_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL, -- Link to student-service
    
    -- Student info (cached for reporting)
    student_name VARCHAR(255) NOT NULL,
    fee_type VARCHAR(100), -- "Home Schooling", "SNC"
    
    -- Payment details
    amount_paid DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- "Cash", "Bank Transfer", "Mobile Money"
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
```

### 4. **Cash OUT (Expenses)**
```sql
CREATE TABLE cashflow_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    -- Expense category (predefined list)
    category VARCHAR(100) NOT NULL, -- From expense_categories table
    
    -- Expense details
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    description TEXT,
    receipt_number VARCHAR(100),
    payment_method VARCHAR(50),
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL
);

-- Expense Categories (Predefined + User-added)
CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) UNIQUE NOT NULL,
    is_system_defined BOOLEAN DEFAULT false, -- true for predefined, false for user-added
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    org_id UUID NOT NULL
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
```

### 5. **Petty Cash Management**
```sql
CREATE TABLE petty_cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    transaction_type VARCHAR(10) NOT NULL, -- 'IN' or 'OUT'
    amount DECIMAL(15,2) NOT NULL,
    transaction_date DATE NOT NULL,
    
    -- Details
    category VARCHAR(100), -- For OUT transactions (what was purchased)
    description TEXT,
    receipt_number VARCHAR(100),
    handled_by VARCHAR(255), -- Person who handled petty cash
    
    -- Balance tracking
    running_balance DECIMAL(15,2), -- Calculated after each transaction
    
    -- Late entry tracking
    is_late_entry BOOLEAN DEFAULT false,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recorded_by UUID,
    
    org_id UUID NOT NULL
);

-- Petty Cash Period Summary
CREATE TABLE petty_cash_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    
    opening_balance DECIMAL(15,2) DEFAULT 0, -- From previous month
    total_in DECIMAL(15,2) DEFAULT 0,
    total_out DECIMAL(15,2) DEFAULT 0,
    closing_balance DECIMAL(15,2) GENERATED ALWAYS AS 
        (opening_balance + total_in - total_out) STORED,
    
    -- Carry forward to next month
    carried_forward DECIMAL(15,2), -- Closing balance carried to next month
    
    org_id UUID NOT NULL,
    UNIQUE(period_id)
);
```

### 6. **Staff Payroll (Monthly)**
```sql
CREATE TABLE staff_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_id UUID REFERENCES cashflow_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL, -- Link to hr-service
    
    -- Employee info (cached)
    employee_name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    
    -- Salary details
    base_salary DECIMAL(15,2) NOT NULL,
    bonuses DECIMAL(15,2) DEFAULT 0,
    deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) GENERATED ALWAYS AS 
        (base_salary + bonuses - deductions) STORED,
    
    -- Payment details
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    
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
```

---

## 🔒 TIME-LOCKING LOGIC

### Period Status Transitions
```java
public enum PeriodStatus {
    OPEN,              // Current month - can record freely
    LATE_ENTRY_PERIOD, // 1-5 days into next month - entries marked as late (RED)
    LOCKED             // After 5 days - cannot add/edit anything
}

@Service
public class CashflowPeriodService {
    
    /**
     * Automatically update period statuses based on current date
     */
    @Scheduled(cron = "0 0 0 * * *") // Run daily at midnight
    public void updatePeriodStatuses() {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int currentMonth = today.getMonthValue();
        int dayOfMonth = today.getDayOfMonth();
        
        // Lock previous month after 5 days
        if (dayOfMonth > 5) {
            CashflowPeriod previousPeriod = getPeriod(
                currentMonth == 1 ? currentYear - 1 : currentYear,
                currentMonth == 1 ? 12 : currentMonth - 1
            );
            
            if (previousPeriod != null && previousPeriod.getStatus() != PeriodStatus.LOCKED) {
                previousPeriod.setStatus(PeriodStatus.LOCKED);
                previousPeriod.setLockedDate(LocalDateTime.now());
                periodRepo.save(previousPeriod);
            }
        }
        
        // Set late entry period for previous month (days 1-5 of current month)
        if (dayOfMonth <= 5) {
            CashflowPeriod previousPeriod = getPeriod(
                currentMonth == 1 ? currentYear - 1 : currentYear,
                currentMonth == 1 ? 12 : currentMonth - 1
            );
            
            if (previousPeriod != null && previousPeriod.getStatus() == PeriodStatus.OPEN) {
                previousPeriod.setStatus(PeriodStatus.LATE_ENTRY_PERIOD);
                previousPeriod.setLateEntryDeadline(
                    LocalDate.of(currentYear, currentMonth, 5).atTime(23, 59, 59)
                );
                periodRepo.save(previousPeriod);
            }
        }
        
        // Create current month period if doesn't exist
        CashflowPeriod currentPeriod = getPeriod(currentYear, currentMonth);
        if (currentPeriod == null) {
            createNewPeriod(currentYear, currentMonth);
        }
    }
    
    /**
     * Create new period with beginning cash from previous month's ending cash
     */
    public CashflowPeriod createNewPeriod(int year, int month) {
        // Get previous month's ending cash
        CashflowPeriod previousPeriod = getPreviousPeriod(year, month);
        BigDecimal beginningCash = previousPeriod != null 
            ? previousPeriod.getEndingCash() 
            : BigDecimal.ZERO;
        
        CashflowPeriod period = new CashflowPeriod();
        period.setYear(year);
        period.setMonth(month);
        period.setPeriodName(getMonthName(month) + " " + year);
        period.setBeginningCash(beginningCash);
        period.setEndingCash(beginningCash); // Will be updated as entries added
        period.setStatus(PeriodStatus.OPEN);
        
        return periodRepo.save(period);
    }
    
    /**
     * Calculate ending cash based on all entries
     * Formula: Beginning Cash + Total Cash In - Total Expenses - Total Payroll
     */
    public void recalculateEndingCash(UUID periodId) {
        CashflowPeriod period = periodRepo.findById(periodId).orElseThrow();
        
        // Get cash IN
        CashflowCashIn cashIn = cashInRepo.findByPeriodId(periodId)
            .orElse(new CashflowCashIn());
        
        // Get total expenses
        BigDecimal totalExpenses = expenseRepo.findByPeriodId(periodId).stream()
            .map(CashflowExpense::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Get total payroll
        BigDecimal totalPayroll = payrollRepo.findByPeriodId(periodId).stream()
            .map(StaffPayroll::getNetSalary)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Get petty cash net
        PettyCashSummary pettyCash = pettyCashSummaryRepo.findByPeriodId(periodId)
            .orElse(new PettyCashSummary());
        BigDecimal pettyCashNet = pettyCash.getTotalIn().subtract(pettyCash.getTotalOut());
        
        // Calculate: Beginning + CashIn + PettyCashNet - Expenses - Payroll
        BigDecimal endingCash = period.getBeginningCash()
            .add(cashIn.getTotalCashIn())
            .add(pettyCashNet)
            .subtract(totalExpenses)
            .subtract(totalPayroll);
        
        period.setEndingCash(endingCash);
        periodRepo.save(period);
    }
    
    /**
     * Validate if user can record entry for a period
     */
    public ValidationResult canRecordEntry(CashflowPeriod period) {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int currentMonth = today.getMonthValue();
        
        // Cannot record future months
        if (period.getYear() > currentYear || 
            (period.getYear() == currentYear && period.getMonth() > currentMonth)) {
            return ValidationResult.error("Cannot record entries for future months");
        }
        
        // Check if period is locked
        if (period.getStatus() == PeriodStatus.LOCKED) {
            return ValidationResult.error(
                "This period is locked. No entries can be added or modified."
            );
        }
        
        // Warn if in late entry period
        if (period.getStatus() == PeriodStatus.LATE_ENTRY_PERIOD) {
            long daysRemaining = ChronoUnit.DAYS.between(
                LocalDateTime.now(), 
                period.getLateEntryDeadline()
            );
            return ValidationResult.warning(
                String.format(
                    "⚠️ Late entry period! You have %d days remaining to record entries for %s. " +
                    "All entries will be marked as LATE (shown in red).",
                    daysRemaining,
                    period.getPeriodName()
                )
            );
        }
        
        return ValidationResult.success();
    }
    
    /**
     * Get notification for user about late recording
     */
    public String getLateRecordingNotification() {
        LocalDate today = LocalDate.now();
        int currentYear = today.getYear();
        int currentMonth = today.getMonthValue();
        int dayOfMonth = today.getDayOfMonth();
        
        if (dayOfMonth <= 5) {
            CashflowPeriod previousPeriod = getPeriod(
                currentMonth == 1 ? currentYear - 1 : currentYear,
                currentMonth == 1 ? 12 : currentMonth - 1
            );
            
            if (previousPeriod != null && 
                previousPeriod.getStatus() == PeriodStatus.LATE_ENTRY_PERIOD) {
                
                int daysRemaining = 5 - dayOfMonth + 1;
                return String.format(
                    "⚠️ REMINDER: You have %d day(s) remaining to record entries for %s. " +
                    "After that, the period will be locked.",
                    daysRemaining,
                    previousPeriod.getPeriodName()
                );
            }
        }
        
        return null;
    }
}
```

---

## 📝 EDIT ATTEMPT TRACKING

### For Student Fees & Payroll (Max 3 Edits)
```java
@Service
public class EditTrackingService {
    
    /**
     * Validate and track edit attempts for one-time monthly entries
     */
    public ValidationResult validateEditAttempt(
            OneTimeEntry entry, // StudentFeePayment or StaffPayroll
            boolean isNewEntry) {
        
        if (isNewEntry) {
            entry.setEditCount(0);
            entry.setEditAttemptsRemaining(3);
            return ValidationResult.success();
        }
        
        // Check if edit attempts exhausted
        if (entry.getEditAttemptsRemaining() <= 0) {
            return ValidationResult.error(
                "Edit attempts exhausted. You cannot modify this entry anymore. " +
                "Please contact an administrator if changes are needed."
            );
        }
        
        // Decrement attempts
        entry.setEditCount(entry.getEditCount() + 1);
        entry.setEditAttemptsRemaining(entry.getEditAttemptsRemaining() - 1);
        entry.setLastEdited(LocalDateTime.now());
        
        // Warning if running low on attempts
        if (entry.getEditAttemptsRemaining() == 1) {
            return ValidationResult.warning(
                String.format(
                    "⚠️ FINAL EDIT REMAINING! You have only 1 more chance to edit this entry. " +
                    "Please review carefully before saving."
                )
            );
        } else if (entry.getEditAttemptsRemaining() == 2) {
            return ValidationResult.warning(
                String.format(
                    "⚠️ You have %d edit attempts remaining for this entry.",
                    entry.getEditAttemptsRemaining()
                )
            );
        }
        
        return ValidationResult.success(
            String.format("Changes saved. %d edit attempts remaining.", 
                entry.getEditAttemptsRemaining())
        );
    }
}
```

---

## 📥 EXCEL IMPORT SERVICE (For Historical Data)

```java
@Service
public class CashflowExcelImportService {
    
    /**
     * Import historical cashflow data from Excel file
     * This is ONE-TIME import for existing data
     */
    public ImportResult importHistoricalData(MultipartFile file) throws Exception {
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        
        // Sheet 1: Cashflow Statement
        Sheet cashflowSheet = workbook.getSheet("Cashflow Statement");
        List<CashflowPeriod> periods = parseCashflowSheet(cashflowSheet);
        
        // Sheet 2: School Fees Revenue
        Sheet revenueSheet = workbook.getSheet("School Fees received - Revenue");
        List<StudentFeePayment> feePayments = parseRevenueSheet(revenueSheet, periods);
        
        // Save all data
        periodRepo.saveAll(periods);
        feePaymentRepo.saveAll(feePayments);
        
        // Recalculate all ending cash balances
        periods.forEach(period -> recalculateEndingCash(period.getId()));
        
        return new ImportResult(periods.size(), feePayments.size());
    }
    
    private List<CashflowPeriod> parseCashflowSheet(Sheet sheet) {
        List<CashflowPeriod> periods = new ArrayList<>();
        
        // Read header row to get month columns
        Row headerRow = sheet.getRow(0); // "Cashflow Projections | Start Up | Jan | Feb | ..."
        List<String> monthColumns = new ArrayList<>();
        
        for (int col = 3; col <= 14; col++) { // Columns D-O (Jan-Dec)
            Cell cell = headerRow.getCell(col);
            if (cell != null) {
                monthColumns.add(cell.getStringCellValue());
            }
        }
        
        // For each month, create a period
        for (int monthIndex = 0; monthIndex < monthColumns.size(); monthIndex++) {
            String monthName = monthColumns.get(monthIndex);
            int month = getMonthNumber(monthName); // "Jan" -> 1
            int year = 2025; // Or extract from Excel
            
            CashflowPeriod period = new CashflowPeriod();
            period.setYear(year);
            period.setMonth(month);
            period.setPeriodName(monthName + " " + year);
            
            // Read Beginning Cash (Row 3, column for this month)
            Row beginCashRow = sheet.getRow(2); // Row 3 in Excel (0-indexed = 2)
            BigDecimal beginningCash = getCellValue(beginCashRow, 3 + monthIndex);
            period.setBeginningCash(beginningCash);
            
            // Read School Fees (Row 4)
            Row schoolFeesRow = sheet.getRow(3);
            BigDecimal schoolFees = getCellValue(schoolFeesRow, 3 + monthIndex);
            
            // Read Other Cash In (Row 5)
            Row otherCashRow = sheet.getRow(4);
            BigDecimal otherCash = getCellValue(otherCashRow, 3 + monthIndex);
            
            // Read Petty Cash IN (Row 6)
            Row pettyCashInRow = sheet.getRow(5);
            BigDecimal pettyCashIn = getCellValue(pettyCashInRow, 3 + monthIndex);
            
            // Create CashIn entry
            CashflowCashIn cashIn = new CashflowCashIn();
            cashIn.setSchoolFeesTotal(schoolFees);
            cashIn.setOtherCashIn(otherCash);
            cashIn.setPettyCashIn(pettyCashIn);
            cashIn.setIsLateEntry(false); // Historical import
            
            // Read all expenses (Rows 10-29)
            List<CashflowExpense> expenses = new ArrayList<>();
            for (int row = 9; row <= 28; row++) {
                Row expenseRow = sheet.getRow(row);
                Cell categoryCell = expenseRow.getCell(1); // Column B
                if (categoryCell != null) {
                    String category = categoryCell.getStringCellValue();
                    BigDecimal amount = getCellValue(expenseRow, 3 + monthIndex);
                    
                    if (amount.compareTo(BigDecimal.ZERO) > 0) {
                        CashflowExpense expense = new CashflowExpense();
                        expense.setCategory(category);
                        expense.setAmount(amount);
                        expense.setTransactionDate(LocalDate.of(year, month, 1));
                        expense.setIsLateEntry(false);
                        expenses.add(expense);
                    }
                }
            }
            
            // Read Ending Cash (Row 33)
            Row endCashRow = sheet.getRow(32);
            BigDecimal endingCash = getCellValue(endCashRow, 3 + monthIndex);
            period.setEndingCash(endingCash);
            
            // Set as LOCKED (historical data)
            period.setStatus(PeriodStatus.LOCKED);
            period.setLockedDate(LocalDateTime.now());
            
            periods.add(period);
        }
        
        return periods;
    }
    
    private BigDecimal getCellValue(Row row, int columnIndex) {
        Cell cell = row.getCell(columnIndex);
        if (cell == null) return BigDecimal.ZERO;
        
        try {
            return BigDecimal.valueOf(cell.getNumericCellValue());
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### Monthly Cashflow Entry Page
```tsx
// frontend-new/src/pages/MonthlyCashflow.tsx
import { useState, useEffect } from 'react';
import { cashflowAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export const MonthlyCashflow = () => {
  const { formatCurrency } = useSettings();
  const [currentPeriod, setCurrentPeriod] = useState<CashflowPeriod | null>(null);
  const [lateNotification, setLateNotification] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  
  useEffect(() => {
    loadCurrentPeriod();
    loadLateNotification();
  }, []);
  
  const loadCurrentPeriod = async () => {
    const period = await cashflowAPI.getCurrentPeriod();
    setCurrentPeriod(period);
    setCanEdit(period.status !== 'LOCKED');
  };
  
  const loadLateNotification = async () => {
    const notification = await cashflowAPI.getLateRecordingNotification();
    setLateNotification(notification);
  };
  
  return (
    <div className="monthly-cashflow">
      <header>
        <h1>📊 Monthly Cashflow - {currentPeriod?.periodName}</h1>
        
        {/* Late Recording Warning */}
        {lateNotification && (
          <div className="alert alert-warning">
            {lateNotification}
          </div>
        )}
        
        {/* Period Status Badge */}
        <div className="period-status">
          {currentPeriod?.status === 'LOCKED' && (
            <span className="badge locked">🔒 Period Locked</span>
          )}
          {currentPeriod?.status === 'LATE_ENTRY_PERIOD' && (
            <span className="badge late">⚠️ Late Entry Period</span>
          )}
          {currentPeriod?.status === 'OPEN' && (
            <span className="badge open">✓ Open for Entry</span>
          )}
        </div>
      </header>
      
      {/* Beginning Cash (Auto-calculated from previous month) */}
      <section className="cash-summary">
        <h2>Cash Balance</h2>
        <div className="balance-card">
          <div className="balance-item">
            <label>Beginning Cash (from last month):</label>
            <span className="amount">{formatCurrency(currentPeriod?.beginningCash || 0)}</span>
          </div>
          <div className="balance-item">
            <label>Ending Cash (calculated):</label>
            <span className="amount green">{formatCurrency(currentPeriod?.endingCash || 0)}</span>
          </div>
        </div>
      </section>
      
      {/* CASH IN Section */}
      <section className="cash-in">
        <h2>💰 Cash IN</h2>
        
        {/* School Fees (One-time entry per month) */}
        <StudentFeesEntry 
          periodId={currentPeriod?.id}
          isLateEntry={currentPeriod?.status === 'LATE_ENTRY_PERIOD'}
          disabled={!canEdit}
        />
        
        {/* Other Cash In */}
        <OtherCashInEntry
          periodId={currentPeriod?.id}
          isLateEntry={currentPeriod?.status === 'LATE_ENTRY_PERIOD'}
          disabled={!canEdit}
        />
        
        {/* Petty Cash IN */}
        <PettyCashInEntry
          periodId={currentPeriod?.id}
          isLateEntry={currentPeriod?.status === 'LATE_ENTRY_PERIOD'}
          disabled={!canEdit}
        />
      </section>
      
      {/* CASH OUT Section */}
      <section className="cash-out">
        <h2>💸 Cash OUT (Expenses)</h2>
        
        {/* Staff Payroll (One-time entry per employee per month) */}
        <StaffPayrollEntry
          periodId={currentPeriod?.id}
          isLateEntry={currentPeriod?.status === 'LATE_ENTRY_PERIOD'}
          disabled={!canEdit}
        />
        
        {/* Expenses by Category */}
        <ExpensesEntry
          periodId={currentPeriod?.id}
          isLateEntry={currentPeriod?.status === 'LATE_ENTRY_PERIOD'}
          disabled={!canEdit}
        />
        
        {/* Petty Cash OUT */}
        <PettyCashOutEntry
          periodId={currentPeriod?.id}
          isLateEntry={currentPeriod?.status === 'LATE_ENTRY_PERIOD'}
          disabled={!canEdit}
        />
      </section>
      
      {/* Petty Cash Balance Tracker */}
      <section className="petty-cash-summary">
        <h2>🏦 Petty Cash Balance</h2>
        <PettyCashBalance periodId={currentPeriod?.id} />
      </section>
    </div>
  );
};
```

### Student Fees Entry Component (Max 3 Edits)
```tsx
const StudentFeesEntry = ({ periodId, isLateEntry, disabled }) => {
  const [students, setStudents] = useState([]);
  const [editAttempts, setEditAttempts] = useState({});
  
  const handleSaveFees = async (studentId, amount) => {
    try {
      const result = await cashflowAPI.saveStudentFee({
        periodId,
        studentId,
        amount,
        isLateEntry
      });
      
      // Show edit attempts warning
      if (result.editAttemptsRemaining !== undefined) {
        if (result.editAttemptsRemaining === 0) {
          alert('⚠️ Edit attempts exhausted! No more changes allowed.');
        } else if (result.editAttemptsRemaining === 1) {
          alert('⚠️ FINAL EDIT! You have only 1 more chance to change this.');
        } else {
          alert(`✓ Saved. ${result.editAttemptsRemaining} edits remaining.`);
        }
      }
      
      loadStudents();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };
  
  return (
    <div className="student-fees-entry">
      <h3>Student Fee Payments</h3>
      {students.map(student => (
        <div key={student.id} className={isLateEntry ? 'late-entry' : ''}>
          <label>{student.name} ({student.feeType})</label>
          <input
            type="number"
            value={student.amountPaid}
            onChange={(e) => handleSaveFees(student.id, e.target.value)}
            disabled={disabled || student.editAttemptsRemaining === 0}
          />
          <span className="edit-attempts">
            {student.editAttemptsRemaining}/3 edits
          </span>
          {isLateEntry && <span className="late-badge">LATE</span>}
        </div>
      ))}
    </div>
  );
};
```

---

## 📊 CASHFLOW STATEMENT REPORT

```tsx
// Generate monthly cashflow statement matching Excel format
const CashflowStatement = ({ periodId }) => {
  const { formatCurrency } = useSettings();
  const [data, setData] = useState(null);
  
  useEffect(() => {
    loadCashflowData();
  }, [periodId]);
  
  const loadCashflowData = async () => {
    const statement = await cashflowAPI.getCashflowStatement(periodId);
    setData(statement);
  };
  
  return (
    <div className="cashflow-statement">
      <h2>Cashflow Statement - {data?.periodName}</h2>
      
      <table>
        <tbody>
          {/* Cash IN */}
          <tr className="section-header">
            <td colSpan={2}>Cash In</td>
          </tr>
          <tr>
            <td>Beginning Cash</td>
            <td className="amount">{formatCurrency(data?.beginningCash)}</td>
          </tr>
          <tr>
            <td>School Fees received</td>
            <td className="amount">{formatCurrency(data?.schoolFees)}</td>
          </tr>
          <tr>
            <td>Other Cash in</td>
            <td className="amount">{formatCurrency(data?.otherCashIn)}</td>
          </tr>
          <tr>
            <td>Petty Cash (IN)</td>
            <td className="amount">{formatCurrency(data?.pettyCashIn)}</td>
          </tr>
          <tr className="total">
            <td>Total Cash In</td>
            <td className="amount">{formatCurrency(data?.totalCashIn)}</td>
          </tr>
          <tr className="highlight">
            <td>Cash Available</td>
            <td className="amount">{formatCurrency(data?.cashAvailable)}</td>
          </tr>
          
          {/* Cash OUT */}
          <tr className="section-header">
            <td colSpan={2}>Cash Out</td>
          </tr>
          {data?.expenses.map(exp => (
            <tr key={exp.category}>
              <td>{exp.category}</td>
              <td className="amount">{formatCurrency(exp.amount)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Total Expenses</td>
            <td className="amount">{formatCurrency(data?.totalExpenses)}</td>
          </tr>
          <tr className="highlight">
            <td>Cash Available (after expenses)</td>
            <td className="amount">{formatCurrency(data?.cashAfterExpenses)}</td>
          </tr>
          
          <tr className="final">
            <td><strong>Ending Cash</strong></td>
            <td className="amount"><strong>{formatCurrency(data?.endingCash)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
```

---

## 🎯 IMPLEMENTATION ROADMAP

### Phase 1: Database & Backend (Week 1)
1. ✅ Create database schema (all 6 tables)
2. ✅ Seed expense categories
3. ✅ Build Period management service (auto-locking logic)
4. ✅ Build Excel import service (one-time historical import)
5. ✅ Build CRUD services for all entities
6. ✅ Implement edit tracking (3 attempts max)
7. ✅ Build validation logic (time-locking, late entries)

### Phase 2: API Endpoints (Week 1-2)
1. ✅ Period endpoints (get current, create new, lock)
2. ✅ Cash IN endpoints (fees, other income, petty cash)
3. ✅ Cash OUT endpoints (expenses, payroll, petty cash)
4. ✅ Petty cash balance tracking
5. ✅ Cashflow statement report generation
6. ✅ Import endpoint (Excel upload)

### Phase 3: Frontend (Week 2-3)
1. ✅ Monthly cashflow entry page
2. ✅ Student fees component (with edit tracking)
3. ✅ Payroll component (with edit tracking)
4. ✅ Expenses entry (multiple entries allowed)
5. ✅ Petty cash IN/OUT tracking
6. ✅ Late entry warnings & notifications
7. ✅ Period status indicators
8. ✅ Cashflow statement report view
9. ✅ Historical data import page

### Phase 4: Testing & Refinement (Week 3)
1. ✅ Test time-locking logic
2. ✅ Test edit attempt limits
3. ✅ Test late entry flagging
4. ✅ Test ending cash calculations
5. ✅ Test cascading (ending → beginning)
6. ✅ Import historical Excel data
7. ✅ User acceptance testing

---

## 🚀 NEXT STEPS

**Ready to start implementing?**

I recommend starting with:
1. **Database schema creation** - Foundation for everything
2. **Period management service** - Auto-locking & time validation
3. **Excel import** - Get historical data into system
4. **Basic entry forms** - Start recording new data

**Shall I begin with Step 1: Creating the database migration script?**
