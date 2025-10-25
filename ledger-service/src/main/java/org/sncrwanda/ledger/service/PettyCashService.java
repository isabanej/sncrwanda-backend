package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.domain.PettyCashTransaction;
import org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType;
import org.sncrwanda.ledger.domain.PettyCashSummary;
import org.sncrwanda.ledger.repo.PettyCashTransactionRepo;
import org.sncrwanda.ledger.repo.PettyCashSummaryRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PettyCashService {

    private final PettyCashTransactionRepo transactionRepo;
    private final PettyCashSummaryRepo summaryRepo;
    private final CashflowPeriodService periodService;

    /**
     * Record a petty cash transaction (IN or OUT)
     */
    @Transactional
    public PettyCashTransaction recordTransaction(
            UUID periodId,
            TransactionType transactionType,
            BigDecimal amount,
            LocalDate transactionDate,
            String category,
            String description,
            String receiptNumber,
            String handledBy,
            UUID recordedBy) {
        
        // Validate period
        periodService.validatePeriodForEntry(periodId);

        // Get period entity
        CashflowPeriod period = periodService.getPeriodById(periodId);
        
        // Create transaction record
        PettyCashTransaction transaction = new PettyCashTransaction();
        transaction.setId(UUID.randomUUID());
        transaction.setPeriod(period);
        transaction.setTransactionType(transactionType);
        transaction.setAmount(amount);
        transaction.setTransactionDate(transactionDate);
        transaction.setCategory(category);
        transaction.setDescription(description);
        transaction.setReceiptNumber(receiptNumber);
        transaction.setHandledBy(handledBy);
        transaction.setRecordedBy(recordedBy);
        transaction.setRecordedAt(LocalDateTime.now());
        
        // Check if this is a late entry
        transaction.setIsLateEntry(periodService.isLateEntry(period));
        
        PettyCashTransaction saved = transactionRepo.save(transaction);
        log.info("Recorded petty cash {} transaction for period {}: {} RWF", 
            transactionType, periodId, amount);
        
        // Update petty cash summary
        updatePettyCashSummary(periodId);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(periodId);
        
        return saved;
    }

    /**
     * Update petty cash summary for a period
     */
    @Transactional
    public void updatePettyCashSummary(UUID periodId) {
        CashflowPeriod period = periodService.getPeriodById(periodId);
        
        // Get or create summary
        PettyCashSummary summary = summaryRepo.findByPeriodId(periodId)
            .orElseGet(() -> {
                PettyCashSummary newSummary = new PettyCashSummary();
                newSummary.setId(UUID.randomUUID());
                newSummary.setPeriod(period);
                
                // Get opening balance from previous period's closing balance
                Optional<PettyCashSummary> previousSummary = getPreviousPeriodSummary(periodId);
                newSummary.setOpeningBalance(
                    previousSummary.map(PettyCashSummary::getClosingBalance).orElse(BigDecimal.ZERO));
                
                return newSummary;
            });
        
        // Calculate totals
        BigDecimal totalIn = transactionRepo.calculateTotalByType(periodId, TransactionType.IN);
        BigDecimal totalOut = transactionRepo.calculateTotalByType(periodId, TransactionType.OUT);
        
        summary.setTotalIn(totalIn);
        summary.setTotalOut(totalOut);
        // closingBalance is calculated by database (GENERATED column)
        
        summaryRepo.save(summary);
        log.info("Updated petty cash summary for period {}: Opening={}, IN={}, OUT={}", 
            periodId, summary.getOpeningBalance(), totalIn, totalOut);
    }

    /**
     * Get previous period's petty cash summary
     */
    private Optional<PettyCashSummary> getPreviousPeriodSummary(UUID periodId) {
        return Optional.ofNullable(periodService.getPeriodById(periodId))
            .flatMap(period -> periodService.periodRepo.findPreviousPeriod(
                period.getYear(), period.getMonth(), period.getOrgId()))
            .flatMap(prevPeriod -> summaryRepo.findByPeriodId(prevPeriod.getId()));
    }

    /**
     * Carry forward petty cash balance to next period
     */
    @Transactional
    public void carryForwardBalance(UUID periodId) {
        PettyCashSummary summary = summaryRepo.findByPeriodId(periodId)
            .orElseThrow(() -> new IllegalArgumentException("Petty cash summary not found for period: " + periodId));
        
        summary.setCarriedForward(summary.getClosingBalance());
        summary.setCarriedForwardDate(LocalDateTime.now());
        summaryRepo.save(summary);
        
        log.info("Carried forward petty cash balance for period {}: {} RWF", 
            periodId, summary.getClosingBalance());
    }

    /**
     * Get all petty cash transactions for a period
     */
    public List<PettyCashTransaction> getTransactionsForPeriod(UUID periodId) {
        return transactionRepo.findByPeriodId(periodId);
    }

    /**
     * Get petty cash transactions by type
     */
    public List<PettyCashTransaction> getTransactionsByType(UUID periodId, TransactionType type) {
        return transactionRepo.findByPeriodIdAndTransactionType(periodId, type);
    }

    /**
     * Get petty cash summary for a period
     */
    public Optional<PettyCashSummary> getSummaryForPeriod(UUID periodId) {
        return summaryRepo.findByPeriodId(periodId);
    }

    /**
     * Get current petty cash balance for a period
     */
    public BigDecimal getCurrentBalance(UUID periodId) {
        return summaryRepo.findByPeriodId(periodId)
            .map(PettyCashSummary::getClosingBalance)
            .orElse(BigDecimal.ZERO);
    }
}

