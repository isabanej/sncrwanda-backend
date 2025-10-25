package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.repo.*;
import org.sncrwanda.ledger.web.dto.CashflowStatementDTO;
import org.sncrwanda.ledger.web.dto.ExpenseByCategoryDTO;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CashflowReportService {

    private final CashflowPeriodRepo periodRepo;
    private final StudentFeePaymentRepo feePaymentRepo;
    private final StaffPayrollRepo payrollRepo;
    private final CashflowExpenseRepo expenseRepo;
    private final PettyCashTransactionRepo pettyCashRepo;
    private final PettyCashSummaryRepo pettyCashSummaryRepo;

    /**
     * Generate complete cashflow statement for a period (matching Excel format)
     */
    public CashflowStatementDTO generateCashflowStatement(UUID periodId) {
        log.info("Generating cashflow statement for period {}", periodId);
        
        CashflowPeriod period = periodRepo.findById(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Period not found: " + periodId));
        
        CashflowStatementDTO statement = new CashflowStatementDTO();
        statement.setPeriodId(periodId);
        statement.setPeriodName(period.getPeriodName());
        statement.setYear(period.getYear());
        statement.setMonth(period.getMonth());
        statement.setStatus(period.getStatus().name());
        
        // Beginning Cash
        statement.setBeginningCash(period.getBeginningCash());
        
        // Cash IN
        BigDecimal schoolFees = feePaymentRepo.calculateTotalForPeriod(periodId);
        BigDecimal pettyCashIn = pettyCashRepo.calculateTotalByType(periodId, 
            org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType.IN);
        
        statement.setSchoolFeesTotal(schoolFees);
        statement.setPettyCashIn(pettyCashIn);
        statement.setOtherCashIn(BigDecimal.ZERO); // Can be extended
        statement.setTotalCashIn(schoolFees.add(pettyCashIn));
        
        // Cash Available
        statement.setCashAvailable(period.getBeginningCash().add(statement.getTotalCashIn()));
        
        // Cash OUT - Expenses by category
        List<Object[]> expensesByCategory = expenseRepo.sumByCategory(periodId);
        List<ExpenseByCategoryDTO> categoryBreakdown = expensesByCategory.stream()
            .map(row -> new ExpenseByCategoryDTO((String) row[0], (BigDecimal) row[1]))
            .collect(Collectors.toList());
        statement.setExpensesByCategory(categoryBreakdown);
        
        BigDecimal totalExpenses = categoryBreakdown.stream()
            .map(ExpenseByCategoryDTO::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        statement.setTotalExpenses(totalExpenses);
        
        // Cash OUT - Payroll
        BigDecimal payroll = payrollRepo.calculateTotalPayrollForPeriod(periodId);
        statement.setTotalPayroll(payroll);
        
        // Cash OUT - Petty Cash
        BigDecimal pettyCashOut = pettyCashRepo.calculateTotalByType(periodId,
            org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType.OUT);
        statement.setPettyCashOut(pettyCashOut);
        
        // Total Cash OUT
        statement.setTotalCashOut(totalExpenses.add(payroll).add(pettyCashOut));
        
        // Ending Cash
        statement.setEndingCash(period.getEndingCash());
        
        // Validation: Check if formula matches
        BigDecimal calculatedEnding = statement.getCashAvailable().subtract(statement.getTotalCashOut());
        statement.setFormulaValid(calculatedEnding.compareTo(period.getEndingCash()) == 0);
        
        log.info("Generated cashflow statement: Beginning={}, TotalIn={}, TotalOut={}, Ending={}", 
            period.getBeginningCash(), statement.getTotalCashIn(), 
            statement.getTotalCashOut(), period.getEndingCash());
        
        return statement;
    }

    /**
     * Get cashflow comparison across multiple periods
     */
    public List<CashflowStatementDTO> getCashflowComparison(UUID orgId, int year) {
        log.info("Generating cashflow comparison for org {} year {}", orgId, year);
        
        List<CashflowPeriod> periods = periodRepo.findByYearOrderByMonth(year, orgId);
        
        return periods.stream()
            .map(period -> generateCashflowStatement(period.getId()))
            .collect(Collectors.toList());
    }

    /**
     * Get cashflow summary for dashboard
     */
    public Map<String, Object> getCashflowSummary(UUID orgId) {
        log.info("Generating cashflow summary for org {}", orgId);
        
        Map<String, Object> summary = new HashMap<>();
        
        // Current period
        LocalDate today = LocalDate.now();
        Optional<CashflowPeriod> currentPeriod = periodRepo.findByYearAndMonthAndOrgId(
            today.getYear(), today.getMonthValue(), orgId);
        
        if (currentPeriod.isPresent()) {
            CashflowPeriod period = currentPeriod.get();
            summary.put("currentPeriod", period.getPeriodName());
            summary.put("currentBeginningCash", period.getBeginningCash());
            summary.put("currentEndingCash", period.getEndingCash());
            summary.put("periodStatus", period.getStatus().name());
            
            // Current month totals
            summary.put("currentMonthFees", feePaymentRepo.calculateTotalForPeriod(period.getId()));
            summary.put("currentMonthExpenses", expenseRepo.calculateTotalForPeriod(period.getId()));
            summary.put("currentMonthPayroll", payrollRepo.calculateTotalPayrollForPeriod(period.getId()));
        }
        
        // Year-to-date totals
        List<CashflowPeriod> yearPeriods = periodRepo.findByYearOrderByMonth(today.getYear(), orgId);
        BigDecimal ytdFees = BigDecimal.ZERO;
        BigDecimal ytdExpenses = BigDecimal.ZERO;
        BigDecimal ytdPayroll = BigDecimal.ZERO;
        
        for (CashflowPeriod period : yearPeriods) {
            ytdFees = ytdFees.add(feePaymentRepo.calculateTotalForPeriod(period.getId()));
            ytdExpenses = ytdExpenses.add(expenseRepo.calculateTotalForPeriod(period.getId()));
            ytdPayroll = ytdPayroll.add(payrollRepo.calculateTotalPayrollForPeriod(period.getId()));
        }
        
        summary.put("yearToDateFees", ytdFees);
        summary.put("yearToDateExpenses", ytdExpenses);
        summary.put("yearToDatePayroll", ytdPayroll);
        summary.put("yearToDateNet", ytdFees.subtract(ytdExpenses).subtract(ytdPayroll));
        
        // Count records
        summary.put("totalPeriods", yearPeriods.size());
        summary.put("openPeriods", periodRepo.findByStatus(CashflowPeriod.PeriodStatus.OPEN).size());
        summary.put("lateEntryPeriods", periodRepo.findByStatus(CashflowPeriod.PeriodStatus.LATE_ENTRY_PERIOD).size());
        
        return summary;
    }

    /**
     * Get late entries report
     */
    public Map<String, Object> getLateEntriesReport(UUID orgId) {
        log.info("Generating late entries report for org {}", orgId);
        
        Map<String, Object> report = new HashMap<>();
        
        report.put("lateFees", feePaymentRepo.findByIsLateEntry(true));
        report.put("latePayroll", payrollRepo.findByIsLateEntry(true));
        
        return report;
    }

    /**
     * Validate cashflow formulas for a period
     */
    public Map<String, Object> validateCashflowFormulas(UUID periodId) {
        log.info("Validating cashflow formulas for period {}", periodId);
        
        CashflowPeriod period = periodRepo.findById(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Period not found: " + periodId));
        
        Map<String, Object> validation = new HashMap<>();
        
        // Calculate totals
        BigDecimal schoolFees = feePaymentRepo.calculateTotalForPeriod(periodId);
        BigDecimal expenses = expenseRepo.calculateTotalForPeriod(periodId);
        BigDecimal payroll = payrollRepo.calculateTotalPayrollForPeriod(periodId);
        BigDecimal pettyCashIn = pettyCashRepo.calculateTotalByType(periodId,
            org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType.IN);
        BigDecimal pettyCashOut = pettyCashRepo.calculateTotalByType(periodId,
            org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType.OUT);
        
        // Formula: Ending = Beginning + SchoolFees + PettyCashIn - Expenses - Payroll - PettyCashOut
        BigDecimal calculatedEnding = period.getBeginningCash()
            .add(schoolFees)
            .add(pettyCashIn)
            .subtract(expenses)
            .subtract(payroll)
            .subtract(pettyCashOut);
        
        validation.put("periodId", periodId);
        validation.put("periodName", period.getPeriodName());
        validation.put("beginningCash", period.getBeginningCash());
        validation.put("schoolFees", schoolFees);
        validation.put("pettyCashIn", pettyCashIn);
        validation.put("expenses", expenses);
        validation.put("payroll", payroll);
        validation.put("pettyCashOut", pettyCashOut);
        validation.put("calculatedEndingCash", calculatedEnding);
        validation.put("recordedEndingCash", period.getEndingCash());
        validation.put("difference", calculatedEnding.subtract(period.getEndingCash()));
        validation.put("valid", calculatedEnding.compareTo(period.getEndingCash()) == 0);
        
        // Check if next period's beginning matches this ending
        Optional<CashflowPeriod> nextPeriod = periodRepo.findNextPeriod(
            period.getYear(), period.getMonth(), period.getOrgId());
        
        if (nextPeriod.isPresent()) {
            boolean cascadeValid = nextPeriod.get().getBeginningCash()
                .compareTo(period.getEndingCash()) == 0;
            validation.put("cascadeValid", cascadeValid);
            validation.put("nextPeriodBeginning", nextPeriod.get().getBeginningCash());
        } else {
            validation.put("cascadeValid", true); // No next period to validate
            validation.put("nextPeriodBeginning", null);
        }
        
        return validation;
    }

    /**
     * Get expense trends analysis
     */
    public Map<String, Object> getExpenseTrends(UUID orgId, int year) {
        log.info("Analyzing expense trends for org {} year {}", orgId, year);
        
        Map<String, Object> trends = new HashMap<>();
        List<CashflowPeriod> periods = periodRepo.findByYearOrderByMonth(year, orgId);
        
        // Collect expense data by month
        List<Map<String, Object>> monthlyData = new ArrayList<>();
        for (CashflowPeriod period : periods) {
            Map<String, Object> monthData = new HashMap<>();
            monthData.put("month", period.getMonth());
            monthData.put("periodName", period.getPeriodName());
            monthData.put("totalExpenses", expenseRepo.calculateTotalForPeriod(period.getId()));
            monthData.put("totalPayroll", payrollRepo.calculateTotalPayrollForPeriod(period.getId()));
            monthData.put("expensesByCategory", expenseRepo.sumByCategory(period.getId()));
            monthlyData.add(monthData);
        }
        
        trends.put("year", year);
        trends.put("monthlyData", monthlyData);
        
        return trends;
    }
}
