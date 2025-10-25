# Cashflow Analysis & Budget Tracking Implementation Plan

## Executive Summary
Implement comprehensive financial analysis system that:
- Imports 12-month cashflow projections from Excel
- Tracks budget vs actual spending
- Links student fees to revenue projections
- Provides real-time cashflow analysis and alerts

---

## 📊 Current State Analysis

### Existing Data (from Excel):
- **Starting Capital**: 10,000,000 RWF
- **Projected Revenue**: 1,519,259 RWF (12 months)
  - School Fees: 1,260,000 RWF (4 students)
  - Other Income: 59,247 RWF
  - Petty Cash: 200,012 RWF
- **Projected Expenses**: 4,804,000 RWF
  - Rent: 2,400,000 RWF (25%)
  - Staff Wages: 1,470,000 RWF (31%)
  - Training: 150,000 RWF
  - Food: 220,000 RWF
  - Therapists: 160,000 RWF
  - Equipment: 81,500 RWF
  - Website: 105,000 RWF
  - Professional Services: 50,000 RWF
  - Other: ~300,000 RWF
- **Projected Ending Cash**: 6,715,259 RWF
- **Financial Runway**: 12 months with declining cash

### Existing System Capabilities:
✅ Transaction tracking (Ledger service)
✅ Student management with guardian links
✅ Employee management (for payroll tracking)
✅ Currency formatting system (50+ currencies, RWF default)
✅ Dark/Light theme support
✅ Three transaction types: INCOME, EXPENSE, PAYROLL

---

## 🎯 Implementation Phases

### **PHASE 1: Database Schema Extensions** (Backend)
**Time Estimate: 2-3 hours**

#### 1.1 Create Budget Schema (ledger-service)

```java
// New Entity: BudgetPeriod.java
@Entity
@Table(name = "budget_periods")
public class BudgetPeriod {
    @Id @GeneratedValue private UUID id;
    private String name; // "2025-2026 Academic Year"
    private LocalDate startDate;
    private LocalDate endDate;
    private BigDecimal startingCash;
    private String notes;
    private boolean isActive;
    private UUID orgId;
}

// New Entity: BudgetLine.java
@Entity
@Table(name = "budget_lines")
public class BudgetLine {
    @Id @GeneratedValue private UUID id;
    
    @ManyToOne
    @JoinColumn(name = "budget_period_id")
    private BudgetPeriod budgetPeriod;
    
    private String category; // Maps to Transaction.category
    private String subcategory; // "Rent", "Food", etc.
    
    // Monthly projections (12 columns)
    private BigDecimal month1;
    private BigDecimal month2;
    private BigDecimal month3;
    private BigDecimal month4;
    private BigDecimal month5;
    private BigDecimal month6;
    private BigDecimal month7;
    private BigDecimal month8;
    private BigDecimal month9;
    private BigDecimal month10;
    private BigDecimal month11;
    private BigDecimal month12;
    
    private BigDecimal totalProjected;
    private TxType type; // INCOME, EXPENSE, PAYROLL
    private UUID orgId;
}

// New Entity: StudentFeeProjection.java
@Entity
@Table(name = "student_fee_projections")
public class StudentFeeProjection {
    @Id @GeneratedValue private UUID id;
    
    @ManyToOne
    @JoinColumn(name = "budget_period_id")
    private BudgetPeriod budgetPeriod;
    
    private UUID studentId; // Link to student-service
    private String studentName;
    private String feeType; // "Home Schooling", "SNC"
    
    // Monthly fee schedule
    private BigDecimal month1;
    private BigDecimal month2;
    // ... month3-12
    private BigDecimal totalAnnual;
    
    private UUID orgId;
}
```

#### 1.2 Create Migration Script

```sql
-- File: deploy/migrations/2025-10-23-budget-tracking.sql

-- Budget Periods table
CREATE TABLE budget_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    starting_cash DECIMAL(15,2) NOT NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    org_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Budget Lines table
CREATE TABLE budget_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_period_id UUID REFERENCES budget_periods(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100) NOT NULL,
    month_1 DECIMAL(15,2) DEFAULT 0,
    month_2 DECIMAL(15,2) DEFAULT 0,
    month_3 DECIMAL(15,2) DEFAULT 0,
    month_4 DECIMAL(15,2) DEFAULT 0,
    month_5 DECIMAL(15,2) DEFAULT 0,
    month_6 DECIMAL(15,2) DEFAULT 0,
    month_7 DECIMAL(15,2) DEFAULT 0,
    month_8 DECIMAL(15,2) DEFAULT 0,
    month_9 DECIMAL(15,2) DEFAULT 0,
    month_10 DECIMAL(15,2) DEFAULT 0,
    month_11 DECIMAL(15,2) DEFAULT 0,
    month_12 DECIMAL(15,2) DEFAULT 0,
    total_projected DECIMAL(15,2) DEFAULT 0,
    type VARCHAR(20) NOT NULL, -- INCOME, EXPENSE, PAYROLL
    org_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Student Fee Projections table
CREATE TABLE student_fee_projections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_period_id UUID REFERENCES budget_periods(id) ON DELETE CASCADE,
    student_id UUID NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    fee_type VARCHAR(100), -- "Home Schooling", "SNC"
    month_1 DECIMAL(15,2) DEFAULT 0,
    month_2 DECIMAL(15,2) DEFAULT 0,
    month_3 DECIMAL(15,2) DEFAULT 0,
    month_4 DECIMAL(15,2) DEFAULT 0,
    month_5 DECIMAL(15,2) DEFAULT 0,
    month_6 DECIMAL(15,2) DEFAULT 0,
    month_7 DECIMAL(15,2) DEFAULT 0,
    month_8 DECIMAL(15,2) DEFAULT 0,
    month_9 DECIMAL(15,2) DEFAULT 0,
    month_10 DECIMAL(15,2) DEFAULT 0,
    month_11 DECIMAL(15,2) DEFAULT 0,
    month_12 DECIMAL(15,2) DEFAULT 0,
    total_annual DECIMAL(15,2) DEFAULT 0,
    org_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_budget_lines_period ON budget_lines(budget_period_id);
CREATE INDEX idx_budget_lines_category ON budget_lines(category, subcategory);
CREATE INDEX idx_student_projections_period ON student_fee_projections(budget_period_id);
CREATE INDEX idx_student_projections_student ON student_fee_projections(student_id);
```

---

### **PHASE 2: Budget Import Service** (Backend)
**Time Estimate: 3-4 hours**

#### 2.1 Excel Parser Service

```java
// New Service: ExcelImportService.java
@Service
public class ExcelImportService {
    
    private final BudgetPeriodRepo budgetPeriodRepo;
    private final BudgetLineRepo budgetLineRepo;
    private final StudentFeeProjectionRepo studentFeeRepo;
    
    public BudgetImportResult importFromExcel(MultipartFile file) {
        Workbook workbook = WorkbookFactory.create(file.getInputStream());
        
        // Create budget period
        BudgetPeriod period = createBudgetPeriod();
        period = budgetPeriodRepo.save(period);
        
        // Import cashflow statement
        Sheet cashflowSheet = workbook.getSheet("Cashflow Statement");
        List<BudgetLine> budgetLines = parseCashflowSheet(cashflowSheet, period);
        budgetLineRepo.saveAll(budgetLines);
        
        // Import student fees
        Sheet revenueSheet = workbook.getSheet("School Fees received - Revenue");
        List<StudentFeeProjection> feeProjections = parseRevenueSheet(revenueSheet, period);
        studentFeeRepo.saveAll(feeProjections);
        
        return new BudgetImportResult(period, budgetLines.size(), feeProjections.size());
    }
    
    private List<BudgetLine> parseCashflowSheet(Sheet sheet, BudgetPeriod period) {
        List<BudgetLine> lines = new ArrayList<>();
        
        // Map Excel categories to budget lines
        Map<String, String> categoryMap = Map.of(
            "Rent", "EXPENSE",
            "Staff Wages", "PAYROLL",
            "Training", "EXPENSE",
            "Food Costs", "EXPENSE",
            "Equipment", "EXPENSE",
            "Website", "EXPENSE",
            "Professional Services / intern", "EXPENSE",
            "therapists", "EXPENSE",
            "Advertising", "EXPENSE",
            "Office Supplies", "EXPENSE",
            "Supplies", "EXPENSE",
            "Business Phone", "EXPENSE",
            "Repair / Maint.", "EXPENSE",
            "School Fees received", "INCOME",
            "Other Cash in", "INCOME"
        );
        
        // Parse each expense/income category row
        for (Row row : sheet) {
            Cell labelCell = row.getCell(1); // Column B
            if (labelCell != null) {
                String label = labelCell.getStringCellValue();
                if (categoryMap.containsKey(label)) {
                    BudgetLine line = new BudgetLine();
                    line.setBudgetPeriod(period);
                    line.setSubcategory(label);
                    line.setType(TxType.valueOf(categoryMap.get(label)));
                    
                    // Read 12 months (columns D-O)
                    line.setMonth1(getCellValue(row, 3));
                    line.setMonth2(getCellValue(row, 4));
                    // ... months 3-12
                    line.setMonth12(getCellValue(row, 14));
                    line.setTotalProjected(getCellValue(row, 15));
                    
                    lines.add(line);
                }
            }
        }
        
        return lines;
    }
}
```

#### 2.2 Budget REST API

```java
// New Controller: BudgetController.java
@RestController
@RequestMapping("/ledger/budget")
public class BudgetController {
    
    private final ExcelImportService importService;
    private final BudgetService budgetService;
    
    // Upload Excel file to import budget
    @PostMapping("/import")
    public ResponseEntity<BudgetImportResult> importBudget(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(importService.importFromExcel(file));
    }
    
    // Get active budget period
    @GetMapping("/active")
    public ResponseEntity<BudgetPeriodDTO> getActiveBudget() {
        return ResponseEntity.ok(budgetService.getActivePeriod());
    }
    
    // Get budget vs actual analysis
    @GetMapping("/analysis")
    public ResponseEntity<BudgetAnalysisDTO> getBudgetAnalysis(
            @RequestParam UUID budgetPeriodId,
            @RequestParam(required = false) Integer monthNumber) {
        return ResponseEntity.ok(budgetService.analyzeVsActual(budgetPeriodId, monthNumber));
    }
    
    // Get cashflow projection
    @GetMapping("/cashflow")
    public ResponseEntity<CashflowProjectionDTO> getCashflowProjection(
            @RequestParam UUID budgetPeriodId) {
        return ResponseEntity.ok(budgetService.calculateCashflow(budgetPeriodId));
    }
    
    // Get variance report
    @GetMapping("/variance")
    public ResponseEntity<VarianceReportDTO> getVarianceReport(
            @RequestParam UUID budgetPeriodId,
            @RequestParam Integer monthNumber) {
        return ResponseEntity.ok(budgetService.calculateVariance(budgetPeriodId, monthNumber));
    }
}
```

#### 2.3 Budget Analysis Service

```java
@Service
public class BudgetService {
    
    private final BudgetLineRepo budgetLineRepo;
    private final TransactionRepo transactionRepo;
    private final StudentFeeProjectionRepo feeProjectionRepo;
    
    public BudgetAnalysisDTO analyzeVsActual(UUID budgetPeriodId, Integer monthNumber) {
        BudgetPeriod period = budgetPeriodRepo.findById(budgetPeriodId).orElseThrow();
        
        // Get all budget lines for this period
        List<BudgetLine> budgetLines = budgetLineRepo.findByBudgetPeriodId(budgetPeriodId);
        
        // Get all actual transactions for this period
        LocalDate startDate = period.getStartDate();
        LocalDate endDate = monthNumber != null 
            ? startDate.plusMonths(monthNumber) 
            : period.getEndDate();
        
        List<Transaction> actualTransactions = transactionRepo
            .findByTxDateBetween(startDate, endDate);
        
        // Calculate totals
        Map<String, BigDecimal> projectedByCategory = calculateProjectedByCategory(budgetLines, monthNumber);
        Map<String, BigDecimal> actualByCategory = calculateActualByCategory(actualTransactions);
        
        // Calculate variances
        Map<String, VarianceDTO> variances = new HashMap<>();
        for (String category : projectedByCategory.keySet()) {
            BigDecimal projected = projectedByCategory.get(category);
            BigDecimal actual = actualByCategory.getOrDefault(category, BigDecimal.ZERO);
            BigDecimal variance = actual.subtract(projected);
            BigDecimal variancePercent = projected.compareTo(BigDecimal.ZERO) > 0
                ? variance.divide(projected, 4, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                : BigDecimal.ZERO;
            
            variances.put(category, new VarianceDTO(
                category, projected, actual, variance, variancePercent,
                variance.compareTo(BigDecimal.ZERO) > 0 ? "OVER_BUDGET" : "UNDER_BUDGET"
            ));
        }
        
        return new BudgetAnalysisDTO(period, variances, calculateCashRunway(period, actualTransactions));
    }
    
    private int calculateCashRunway(BudgetPeriod period, List<Transaction> transactions) {
        // Calculate current cash balance
        BigDecimal currentCash = period.getStartingCash();
        for (Transaction tx : transactions) {
            if (tx.getType() == TxType.INCOME) {
                currentCash = currentCash.add(tx.getAmount());
            } else {
                currentCash = currentCash.subtract(tx.getAmount());
            }
        }
        
        // Calculate average monthly burn rate
        BigDecimal totalExpenses = transactions.stream()
            .filter(tx -> tx.getType() == TxType.EXPENSE || tx.getType() == TxType.PAYROLL)
            .map(Transaction::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        int monthsElapsed = (int) ChronoUnit.MONTHS.between(period.getStartDate(), LocalDate.now());
        BigDecimal avgMonthlyBurn = monthsElapsed > 0 
            ? totalExpenses.divide(new BigDecimal(monthsElapsed), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;
        
        // Calculate months of runway
        return avgMonthlyBurn.compareTo(BigDecimal.ZERO) > 0
            ? currentCash.divide(avgMonthlyBurn, 0, RoundingMode.DOWN).intValue()
            : 999; // Infinite runway if no expenses
    }
}
```

---

### **PHASE 3: Frontend Cashflow Dashboard** (React)
**Time Estimate: 4-5 hours**

#### 3.1 Create Cashflow Dashboard Component

```tsx
// New File: frontend-new/src/pages/CashflowDashboard.tsx
import { useState, useEffect } from 'react';
import { budgetAPI } from '../services/api';
import { useSettings } from '../context/SettingsContext';
import { LineChart, BarChart } from '../components/Charts';
import './CashflowDashboard.css';

interface BudgetAnalysis {
  period: BudgetPeriod;
  variances: Record<string, Variance>;
  cashRunwayMonths: number;
}

interface CashflowProjection {
  months: string[];
  beginningCash: number[];
  income: number[];
  expenses: number[];
  endingCash: number[];
}

export const CashflowDashboard = () => {
  const { formatCurrency } = useSettings();
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [cashflow, setCashflow] = useState<CashflowProjection | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = YTD
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [analysisData, cashflowData] = await Promise.all([
        budgetAPI.getAnalysis(selectedMonth || undefined),
        budgetAPI.getCashflowProjection(),
      ]);
      setAnalysis(analysisData);
      setCashflow(cashflowData);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (!analysis || !cashflow) return <div className="error">No budget data available</div>;

  const criticalVariances = Object.values(analysis.variances)
    .filter(v => Math.abs(v.variancePercent) > 10 && v.status === 'OVER_BUDGET');

  return (
    <div className="cashflow-dashboard">
      <header className="dashboard-header">
        <h1>📊 Cashflow Analysis</h1>
        <div className="period-info">
          <span>{analysis.period.name}</span>
          <span>Starting Capital: {formatCurrency(analysis.period.startingCash)}</span>
        </div>
      </header>

      {/* Cash Runway Alert */}
      {analysis.cashRunwayMonths < 6 && (
        <div className="alert alert-danger">
          ⚠️ <strong>Cash Runway Alert:</strong> Only {analysis.cashRunwayMonths} months of operating
          cash remaining at current burn rate!
        </div>
      )}

      {/* Budget Variance Alerts */}
      {criticalVariances.length > 0 && (
        <div className="alert alert-warning">
          ⚠️ <strong>{criticalVariances.length} Budget Overruns Detected:</strong>
          <ul>
            {criticalVariances.map(v => (
              <li key={v.category}>
                {v.category}: {v.variancePercent.toFixed(1)}% over budget 
                ({formatCurrency(v.variance)} excess)
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Month Selector */}
      <div className="month-selector">
        <label>View Period:</label>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
          <option value={0}>Year to Date</option>
          {cashflow.months.map((month, idx) => (
            <option key={idx} value={idx + 1}>
              {month}
            </option>
          ))}
        </select>
      </div>

      {/* Key Metrics Grid */}
      <div className="metrics-grid">
        <MetricCard
          title="Current Cash Balance"
          value={formatCurrency(cashflow.endingCash[cashflow.endingCash.length - 1])}
          trend="down"
          subtitle={`${analysis.cashRunwayMonths} months runway`}
        />
        <MetricCard
          title="Total Income (YTD)"
          value={formatCurrency(cashflow.income.reduce((a, b) => a + b, 0))}
          trend="up"
          subtitle="From student fees & other sources"
        />
        <MetricCard
          title="Total Expenses (YTD)"
          value={formatCurrency(cashflow.expenses.reduce((a, b) => a + b, 0))}
          trend="down"
          subtitle={`${Object.keys(analysis.variances).length} categories tracked`}
        />
        <MetricCard
          title="Net Cashflow"
          value={formatCurrency(
            cashflow.income.reduce((a, b) => a + b, 0) - 
            cashflow.expenses.reduce((a, b) => a + b, 0)
          )}
          trend={cashflow.income.reduce((a, b) => a + b, 0) > 
                 cashflow.expenses.reduce((a, b) => a + b, 0) ? 'up' : 'down'}
        />
      </div>

      {/* Cashflow Chart */}
      <div className="chart-section">
        <h2>12-Month Cashflow Projection</h2>
        <LineChart
          data={{
            labels: cashflow.months,
            datasets: [
              {
                label: 'Beginning Cash',
                data: cashflow.beginningCash,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
              },
              {
                label: 'Income',
                data: cashflow.income,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
              },
              {
                label: 'Expenses',
                data: cashflow.expenses,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
              },
              {
                label: 'Ending Cash',
                data: cashflow.endingCash,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                borderWidth: 3,
              },
            ],
          }}
        />
      </div>

      {/* Budget vs Actual by Category */}
      <div className="chart-section">
        <h2>Budget vs Actual by Category</h2>
        <BarChart
          data={{
            labels: Object.keys(analysis.variances),
            datasets: [
              {
                label: 'Projected',
                data: Object.values(analysis.variances).map(v => v.projected),
                backgroundColor: '#93c5fd',
              },
              {
                label: 'Actual',
                data: Object.values(analysis.variances).map(v => v.actual),
                backgroundColor: '#60a5fa',
              },
            ],
          }}
        />
      </div>

      {/* Variance Table */}
      <div className="variance-table">
        <h2>Detailed Variance Analysis</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Projected</th>
              <th>Actual</th>
              <th>Variance</th>
              <th>% Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(analysis.variances)
              .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent))
              .map((variance) => (
                <tr key={variance.category} className={variance.status.toLowerCase()}>
                  <td>{variance.category}</td>
                  <td>{formatCurrency(variance.projected)}</td>
                  <td>{formatCurrency(variance.actual)}</td>
                  <td className={variance.variance > 0 ? 'negative' : 'positive'}>
                    {formatCurrency(Math.abs(variance.variance))}
                  </td>
                  <td>{variance.variancePercent.toFixed(1)}%</td>
                  <td>
                    <span className={`badge ${variance.status.toLowerCase()}`}>
                      {variance.status === 'OVER_BUDGET' ? '⚠️ Over' : '✓ Under'}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
```

#### 3.2 Budget Import Page

```tsx
// New File: frontend-new/src/pages/BudgetImport.tsx
import { useState } from 'react';
import { budgetAPI } from '../services/api';
import './BudgetImport.css';

export const BudgetImport = () => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setImporting(true);
      setError('');
      const importResult = await budgetAPI.importExcel(file);
      setResult(importResult);
    } catch (err: any) {
      setError(err.message || 'Failed to import budget');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="budget-import">
      <h1>📊 Import Budget from Excel</h1>
      
      <div className="import-form">
        <div className="file-upload">
          <label htmlFor="excel-file">Choose Excel File:</label>
          <input
            id="excel-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
          />
          {file && <p className="file-name">Selected: {file.name}</p>}
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="btn-primary"
        >
          {importing ? 'Importing...' : 'Import Budget'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          ❌ {error}
        </div>
      )}

      {result && (
        <div className="import-result">
          <h2>✅ Import Successful!</h2>
          <div className="result-stats">
            <div className="stat">
              <span className="label">Budget Period:</span>
              <span className="value">{result.period.name}</span>
            </div>
            <div className="stat">
              <span className="label">Budget Lines Imported:</span>
              <span className="value">{result.budgetLinesCount}</span>
            </div>
            <div className="stat">
              <span className="label">Student Fee Projections:</span>
              <span className="value">{result.feeProjectionsCount}</span>
            </div>
            <div className="stat">
              <span className="label">Starting Cash:</span>
              <span className="value">{formatCurrency(result.period.startingCash)}</span>
            </div>
          </div>
          <a href="/cashflow" className="btn-primary">
            View Cashflow Dashboard →
          </a>
        </div>
      )}

      <div className="instructions">
        <h3>📋 Instructions</h3>
        <ol>
          <li>Prepare your Excel file with sheets: "Cashflow Statement" and "School Fees received - Revenue"</li>
          <li>Ensure categories match: Rent, Staff Wages, Training, Food Costs, Equipment, etc.</li>
          <li>Include 12 months of projections (columns for each month)</li>
          <li>Student fees should list student names with monthly breakdown</li>
          <li>Click "Choose File" and select your Excel workbook</li>
          <li>Click "Import Budget" to process the file</li>
        </ol>
      </div>
    </div>
  );
};
```

#### 3.3 Add Budget API Service

```typescript
// Add to: frontend-new/src/services/api.ts

export const budgetAPI = {
  // Import Excel file
  importExcel: async (file: File): Promise<BudgetImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/ledger/budget/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Get active budget period
  getActiveBudget: async (): Promise<BudgetPeriod> => {
    const response = await api.get('/ledger/budget/active');
    return response.data;
  },

  // Get budget analysis
  getAnalysis: async (monthNumber?: number): Promise<BudgetAnalysis> => {
    const params = monthNumber ? { monthNumber } : {};
    const response = await api.get('/ledger/budget/analysis', { params });
    return response.data;
  },

  // Get cashflow projection
  getCashflowProjection: async (): Promise<CashflowProjection> => {
    const response = await api.get('/ledger/budget/cashflow');
    return response.data;
  },

  // Get variance report
  getVarianceReport: async (monthNumber: number): Promise<VarianceReport> => {
    const response = await api.get('/ledger/budget/variance', {
      params: { monthNumber },
    });
    return response.data;
  },
};
```

---

### **PHASE 4: Enhanced Ledger Integration** (Backend + Frontend)
**Time Estimate: 2-3 hours**

#### 4.1 Link Transactions to Budget

```java
// Update Transaction entity
@Entity
@Table(name="transactions")
public class Transaction {
    // ... existing fields
    
    @ManyToOne
    @JoinColumn(name = "budget_line_id")
    private BudgetLine budgetLine; // Optional link to budget
    
    private boolean isProjected; // false = actual, true = projected
}
```

#### 4.2 Update Ledger Page to Show Budget Context

```tsx
// Update: frontend-new/src/pages/Ledger.tsx

// Add budget context to transaction form
const [budgetContext, setBudgetContext] = useState<BudgetContext | null>(null);

useEffect(() => {
  // Load budget context when category selected
  if (formData.category) {
    loadBudgetContext(formData.category);
  }
}, [formData.category]);

const loadBudgetContext = async (category: string) => {
  const context = await budgetAPI.getCategoryBudget(category, getCurrentMonth());
  setBudgetContext(context);
};

// In the form, show budget remaining
{budgetContext && (
  <div className="budget-hint">
    <div className="budget-info">
      <span>Monthly Budget: {formatCurrency(budgetContext.projected)}</span>
      <span>Spent This Month: {formatCurrency(budgetContext.spent)}</span>
      <span className={budgetContext.remaining < 0 ? 'over-budget' : 'under-budget'}>
        Remaining: {formatCurrency(budgetContext.remaining)}
      </span>
    </div>
    {budgetContext.remaining < 0 && (
      <div className="warning">⚠️ This category is over budget</div>
    )}
  </div>
)}
```

---

### **PHASE 5: Financial Reports** (Backend + Frontend)
**Time Estimate: 3-4 hours**

#### 5.1 Report Generation Service

```java
@Service
public class FinancialReportService {
    
    public ProfitLossReport generateProfitLoss(LocalDate startDate, LocalDate endDate) {
        // Revenue
        BigDecimal totalRevenue = transactionRepo.findByTypeAndDateBetween(
            TxType.INCOME, startDate, endDate
        ).stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Expenses
        BigDecimal totalExpenses = transactionRepo.findByTypeAndDateBetween(
            TxType.EXPENSE, startDate, endDate
        ).stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Payroll
        BigDecimal totalPayroll = transactionRepo.findByTypeAndDateBetween(
            TxType.PAYROLL, startDate, endDate
        ).stream().map(Transaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal netIncome = totalRevenue.subtract(totalExpenses).subtract(totalPayroll);
        
        return new ProfitLossReport(startDate, endDate, totalRevenue, 
                                    totalExpenses, totalPayroll, netIncome);
    }
    
    public CashflowStatement generateCashflowStatement(LocalDate startDate, LocalDate endDate) {
        // Similar logic to generate cashflow statement
    }
    
    public StudentRevenueReport generateStudentRevenueReport(UUID budgetPeriodId) {
        // Compare projected vs actual student fee collections
    }
}
```

---

## 🎯 Implementation Priority & Roadmap

### Week 1: Foundation
1. ✅ Database schema (1 day)
2. ✅ Excel import service (2 days)
3. ✅ Budget API endpoints (2 days)

### Week 2: Dashboard
4. ✅ Cashflow dashboard component (2 days)
5. ✅ Budget import page (1 day)
6. ✅ Charts & visualizations (2 days)

### Week 3: Integration
7. ✅ Ledger page integration (1 day)
8. ✅ Budget alerts & warnings (1 day)
9. ✅ Financial reports (2 days)
10. ✅ Testing & refinement (1 day)

---

## 📊 Expected Outcomes

### Business Value:
- **Real-time visibility** into school finances
- **Proactive alerts** when budget overruns detected
- **Cash runway tracking** to prevent running out of funds
- **Student fee tracking** to ensure timely collections
- **Expense optimization** by identifying overspending categories

### Technical Value:
- Excel data transformed into actionable database records
- RESTful API for budget operations
- Interactive dashboards with charts
- Integration with existing transaction system
- Automated variance analysis

### Key Metrics Tracked:
1. **Cash Runway**: Months of operating capital remaining
2. **Budget Variance**: Actual vs projected by category
3. **Student Fee Collection**: Revenue vs expectations
4. **Burn Rate**: Monthly spending trends
5. **Category Spending**: Detailed expense breakdown

---

## 🚀 Next Steps

**Would you like me to:**
1. Start implementing the database schema first?
2. Create the Excel import service?
3. Build the cashflow dashboard component?
4. Set up a priority order based on your most urgent needs?

Let me know which phase you'd like to tackle first!
