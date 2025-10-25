package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.domain.CashflowPeriod.PeriodStatus;
import org.sncrwanda.ledger.dto.CashflowPeriodWithTotalsDTO;
import org.sncrwanda.ledger.repo.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CashflowPeriodService {

    final CashflowPeriodRepo periodRepo; // Package-private for other services
    private final StudentFeePaymentRepo feePaymentRepo;
    private final StaffPayrollRepo payrollRepo;
    private final CashflowExpenseRepo expenseRepo;
    private final PettyCashTransactionRepo pettyCashRepo;
    private final CashflowCashInRepo cashInRepo;

    /**
     * Get or create period for current month
     */
    @Transactional
    public CashflowPeriod getCurrentPeriod(UUID orgId) {
        LocalDate today = LocalDate.now();
        return getOrCreatePeriod(today.getYear(), today.getMonthValue(), orgId);
    }

    /**
     * Get or create a specific period
     */
    @Transactional
    public CashflowPeriod getOrCreatePeriod(int year, int month, UUID orgId) {
        Optional<CashflowPeriod> existing = periodRepo.findByYearAndMonthAndOrgId(year, month, orgId);
        if (existing.isPresent()) {
            return existing.get();
        }

        // Create new period
        CashflowPeriod period = new CashflowPeriod();
        period.setId(UUID.randomUUID());
        period.setOrgId(orgId);
        period.setYear(year);
        period.setMonth(month);
        period.setPeriodName(String.format("%s %d", 
            YearMonth.of(year, month).getMonth().name(), year));
        
        // Set beginning cash from previous period's ending cash
        Optional<CashflowPeriod> previousPeriod = periodRepo.findPreviousPeriod(year, month, orgId);
        BigDecimal beginningCash = previousPeriod
            .map(CashflowPeriod::getEndingCash)
            .orElse(BigDecimal.ZERO);
        period.setBeginningCash(beginningCash);
        period.setEndingCash(beginningCash); // Initially same as beginning
        
        // Set status and deadline
        period.setStatus(determineInitialStatus(year, month));
        period.setLateEntryDeadline(calculateLateEntryDeadline(year, month));
        
        period.setCreatedAt(LocalDateTime.now());
        period.setLastUpdated(LocalDateTime.now());

        return periodRepo.save(period);
    }

    /**
     * Get period by ID
     */
    public CashflowPeriod getPeriodById(UUID periodId) {
        return periodRepo.findById(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Period not found: " + periodId));
    }

    /**
     * Determine initial status based on current date
     */
    private PeriodStatus determineInitialStatus(int year, int month) {
        LocalDate today = LocalDate.now();
        YearMonth periodMonth = YearMonth.of(year, month);
        YearMonth currentMonth = YearMonth.from(today);
        
        if (periodMonth.equals(currentMonth)) {
            // Current month is OPEN
            return PeriodStatus.OPEN;
        } else if (periodMonth.isBefore(currentMonth)) {
            // Past period - check if within 5-day grace period
            LocalDate periodEnd = periodMonth.atEndOfMonth();
            long daysSinceEnd = java.time.temporal.ChronoUnit.DAYS.between(periodEnd, today);
            if (daysSinceEnd <= 5) {
                return PeriodStatus.LATE_ENTRY_PERIOD;
            }
            // Past periods (after grace period) are CLOSED
            return PeriodStatus.CLOSED;
        } else {
            // Future periods are LOCKED
            return PeriodStatus.LOCKED;
        }
    }

    /**
     * Calculate late entry deadline (5 days after month end)
     */
    private LocalDateTime calculateLateEntryDeadline(int year, int month) {
        LocalDate monthEnd = YearMonth.of(year, month).atEndOfMonth();
        return monthEnd.plusDays(5).atTime(23, 59, 59);
    }

    /**
     * Check if entries can be recorded for a period
     */
    public boolean canRecordEntry(CashflowPeriod period) {
        return period.getStatus() == PeriodStatus.OPEN || 
               period.getStatus() == PeriodStatus.LATE_ENTRY_PERIOD;
    }

    /**
     * Check if entry is late (after month end but within grace period)
     */
    public boolean isLateEntry(CashflowPeriod period) {
        if (period.getStatus() != PeriodStatus.LATE_ENTRY_PERIOD) {
            return false;
        }
        LocalDate today = LocalDate.now();
        LocalDate monthEnd = YearMonth.of(period.getYear(), period.getMonth()).atEndOfMonth();
        return today.isAfter(monthEnd);
    }

    /**
     * Get notification message for late entry grace period
     */
    public String getLateEntryNotification(CashflowPeriod period) {
        if (period.getStatus() != PeriodStatus.LATE_ENTRY_PERIOD) {
            return null;
        }
        
        LocalDateTime deadline = period.getLateEntryDeadline();
        LocalDateTime now = LocalDateTime.now();
        long daysRemaining = java.time.temporal.ChronoUnit.DAYS.between(now.toLocalDate(), deadline.toLocalDate());
        
        if (daysRemaining > 0) {
            return String.format("You have %d day%s remaining to record entries for %s", 
                daysRemaining, daysRemaining == 1 ? "" : "s", period.getPeriodName());
        } else {
            long hoursRemaining = java.time.temporal.ChronoUnit.HOURS.between(now, deadline);
            if (hoursRemaining > 0) {
                return String.format("You have %d hour%s remaining to record entries for %s", 
                    hoursRemaining, hoursRemaining == 1 ? "" : "s", period.getPeriodName());
            }
            return String.format("Grace period for %s expires soon!", period.getPeriodName());
        }
    }

    /**
     * Recalculate ending cash for a period based on all entries
     */
    @Transactional
    public void recalculateEndingCash(UUID periodId) {
        CashflowPeriod period = periodRepo.findById(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Period not found: " + periodId));

        BigDecimal beginningCash = period.getBeginningCash();
        
        // Calculate total cash IN
        BigDecimal studentFees = feePaymentRepo.calculateTotalForPeriod(periodId);
        BigDecimal expenses = expenseRepo.calculateTotalForPeriod(periodId);
        BigDecimal payroll = payrollRepo.calculateTotalPayrollForPeriod(periodId);
        
        // Get petty cash net (IN - OUT)
        BigDecimal pettyCashIn = pettyCashRepo.calculateTotalByType(periodId, 
            org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType.IN);
        BigDecimal pettyCashOut = pettyCashRepo.calculateTotalByType(periodId, 
            org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType.OUT);
        BigDecimal pettyCashNet = pettyCashIn.subtract(pettyCashOut);
        
        // Ending cash = Beginning + StudentFees + PettyCashNet - Expenses - Payroll
        BigDecimal endingCash = beginningCash
            .add(studentFees)
            .add(pettyCashNet)
            .subtract(expenses)
            .subtract(payroll);
        
        period.setEndingCash(endingCash);
        // JPA @PreUpdate will handle lastUpdated automatically
        periodRepo.save(period);
        
        log.info("Recalculated ending cash for period {}-{}: Beginning={}, Fees={}, Expenses={}, Payroll={}, PettyCash={}, Ending={}", 
            period.getYear(), period.getMonth(), beginningCash, studentFees, expenses, payroll, pettyCashNet, endingCash);
        
        // Update next period's beginning cash if it exists
        updateNextPeriodBeginningCash(period);
    }

    /**
     * Update next period's beginning cash when current period's ending cash changes
     */
    private void updateNextPeriodBeginningCash(CashflowPeriod period) {
        Optional<CashflowPeriod> nextPeriod = periodRepo.findNextPeriod(
            period.getYear(), period.getMonth(), period.getOrgId());
        
        if (nextPeriod.isPresent()) {
            CashflowPeriod next = nextPeriod.get();
            next.setBeginningCash(period.getEndingCash());
            // JPA @PreUpdate will handle lastUpdated automatically
            periodRepo.save(next);
            
            log.info("Cascaded ending cash to next period: {}-{} beginning cash = {}", 
                next.getYear(), next.getMonth(), period.getEndingCash());
            
            // Recursively recalculate next period's ending cash
            recalculateEndingCash(next.getId());
        }
    }

    /**
     * Scheduled job to update period statuses (runs daily at 1 AM)
     */
    @Scheduled(cron = "0 0 1 * * *")
    @Transactional
    public void updatePeriodStatuses() {
        log.info("Running scheduled period status update job");
        
        LocalDate today = LocalDate.now();
        List<CashflowPeriod> openPeriods = periodRepo.findByStatus(PeriodStatus.OPEN);
        List<CashflowPeriod> lateEntryPeriods = periodRepo.findByStatus(PeriodStatus.LATE_ENTRY_PERIOD);
        
        // Transition OPEN periods that are now in the past
        for (CashflowPeriod period : openPeriods) {
            YearMonth periodMonth = YearMonth.of(period.getYear(), period.getMonth());
            YearMonth currentMonth = YearMonth.from(today);
            
            if (periodMonth.isBefore(currentMonth)) {
                period.setStatus(PeriodStatus.LATE_ENTRY_PERIOD);
                period.setLastUpdated(LocalDateTime.now());
                periodRepo.save(period);
                log.info("Transitioned period {}-{} to LATE_ENTRY_PERIOD", period.getYear(), period.getMonth());
            }
        }
        
        // Close LATE_ENTRY_PERIOD periods that exceeded deadline (change from LOCKED to CLOSED)
        for (CashflowPeriod period : lateEntryPeriods) {
            if (LocalDateTime.now().isAfter(period.getLateEntryDeadline())) {
                period.setStatus(PeriodStatus.CLOSED);
                period.setLockedDate(LocalDateTime.now());
                period.setLastUpdated(LocalDateTime.now());
                periodRepo.save(period);
                log.info("Closed period {}-{} after grace period expired", period.getYear(), period.getMonth());
            }
        }
    }

    /**
     * Lock a period manually (admin action)
     */
    @Transactional
    public void lockPeriod(UUID periodId, UUID userId) {
        CashflowPeriod period = periodRepo.findById(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Period not found: " + periodId));
        
        if (period.getStatus() == PeriodStatus.LOCKED) {
            throw new IllegalStateException("Period is already locked");
        }
        
        period.setStatus(PeriodStatus.LOCKED);
        period.setLockedDate(LocalDateTime.now());
        period.setLastUpdated(LocalDateTime.now());
        periodRepo.save(period);
        
        log.info("Period {}-{} manually locked by user {}", period.getYear(), period.getMonth(), userId);
    }

    /**
     * Get all periods for an organization
     */
    public List<CashflowPeriod> getAllPeriods(UUID orgId) {
        return periodRepo.findByOrgIdOrderByYearDescMonthDesc(orgId);
    }

    /**
     * Get all periods with totals for an organization
     */
    public List<CashflowPeriodWithTotalsDTO> getAllPeriodsWithTotals(UUID orgId) {
        List<CashflowPeriod> periods = periodRepo.findByOrgIdOrderByYearDescMonthDesc(orgId);
        return periods.stream()
                .map(period -> {
                    CashflowPeriodWithTotalsDTO dto = CashflowPeriodWithTotalsDTO.from(period);
                    
                    // Calculate total fees (student fee payments)
                    BigDecimal totalFees = feePaymentRepo.sumAmountPaidByPeriodId(period.getId())
                            .orElse(BigDecimal.ZERO);
                    dto.setTotalFees(totalFees);
                    
                    // Calculate total income (fees + cash-in transactions)
                    BigDecimal totalCashIn = cashInRepo.sumAmountByPeriodId(period.getId())
                            .orElse(BigDecimal.ZERO);
                    dto.setTotalIncome(totalFees.add(totalCashIn));
                    
                    // Calculate total expenses (payroll + expenses + petty cash out)
                    BigDecimal totalPayroll = payrollRepo.sumTotalPayByPeriodId(period.getId())
                            .orElse(BigDecimal.ZERO);
                    BigDecimal totalExpenses = expenseRepo.sumAmountByPeriodId(period.getId())
                            .orElse(BigDecimal.ZERO);
                    BigDecimal totalPettyCashOut = pettyCashRepo.sumAmountByPeriodIdAndType(period.getId())
                            .orElse(BigDecimal.ZERO);
                    dto.setTotalExpenses(totalPayroll.add(totalExpenses).add(totalPettyCashOut));
                    
                    return dto;
                })
                .toList();
    }

    /**
     * Validate that period exists and can accept entries
     */
    public void validatePeriodForEntry(UUID periodId) {
        CashflowPeriod period = periodRepo.findById(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Period not found: " + periodId));
        
        if (!canRecordEntry(period)) {
            throw new IllegalStateException(
                String.format("Cannot record entries for %s - period is %s", 
                    period.getPeriodName(), period.getStatus()));
        }
    }
}
