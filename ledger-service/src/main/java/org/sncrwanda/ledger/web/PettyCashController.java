package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.PettyCashTransaction;
import org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType;
import org.sncrwanda.ledger.domain.PettyCashSummary;
import org.sncrwanda.ledger.service.PettyCashService;
import org.sncrwanda.ledger.web.dto.PettyCashTransactionRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/petty-cash")
@RequiredArgsConstructor
@Slf4j
public class PettyCashController {

    private final PettyCashService pettyCashService;

    /**
     * Record a petty cash transaction (IN or OUT)
     */
    @PostMapping("/transactions")
    public ResponseEntity<PettyCashTransaction> recordTransaction(@RequestBody PettyCashTransactionRequest request) {
        log.info("Recording petty cash {} transaction for period {}", 
            request.getTransactionType(), request.getPeriodId());
        
        PettyCashTransaction transaction = pettyCashService.recordTransaction(
            request.getPeriodId(),
            request.getTransactionType(),
            request.getAmount(),
            request.getTransactionDate(),
            request.getCategory(),
            request.getDescription(),
            request.getReceiptNumber(),
            request.getHandledBy(),
            request.getRecordedBy()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(transaction);
    }

    /**
     * Get all petty cash transactions for a period
     */
    @GetMapping("/transactions/period/{periodId}")
    public ResponseEntity<List<PettyCashTransaction>> getTransactionsForPeriod(@PathVariable UUID periodId) {
        log.info("Getting petty cash transactions for period {}", periodId);
        List<PettyCashTransaction> transactions = pettyCashService.getTransactionsForPeriod(periodId);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Get petty cash transactions by type
     */
    @GetMapping("/transactions/period/{periodId}/type/{type}")
    public ResponseEntity<List<PettyCashTransaction>> getTransactionsByType(
            @PathVariable UUID periodId,
            @PathVariable TransactionType type) {
        log.info("Getting petty cash {} transactions for period {}", type, periodId);
        List<PettyCashTransaction> transactions = pettyCashService.getTransactionsByType(periodId, type);
        return ResponseEntity.ok(transactions);
    }

    /**
     * Get petty cash summary for a period
     */
    @GetMapping("/summary/period/{periodId}")
    public ResponseEntity<PettyCashSummary> getSummaryForPeriod(@PathVariable UUID periodId) {
        log.info("Getting petty cash summary for period {}", periodId);
        return pettyCashService.getSummaryForPeriod(periodId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get current petty cash balance for a period
     */
    @GetMapping("/balance/period/{periodId}")
    public ResponseEntity<BigDecimal> getCurrentBalance(@PathVariable UUID periodId) {
        log.info("Getting current petty cash balance for period {}", periodId);
        BigDecimal balance = pettyCashService.getCurrentBalance(periodId);
        return ResponseEntity.ok(balance);
    }

    /**
     * Carry forward petty cash balance to next period
     */
    @PostMapping("/carry-forward/{periodId}")
    public ResponseEntity<Void> carryForwardBalance(@PathVariable UUID periodId) {
        log.info("Carrying forward petty cash balance for period {}", periodId);
        pettyCashService.carryForwardBalance(periodId);
        return ResponseEntity.ok().build();
    }
}
