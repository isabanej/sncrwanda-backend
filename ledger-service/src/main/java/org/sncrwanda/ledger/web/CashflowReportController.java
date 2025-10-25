package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.service.CashflowReportService;
import org.sncrwanda.ledger.web.dto.CashflowStatementDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/reports")
@RequiredArgsConstructor
@Slf4j
public class CashflowReportController {

    private final CashflowReportService reportService;

    /**
     * Generate complete cashflow statement for a period (Excel format)
     */
    @GetMapping("/statement/{periodId}")
    public ResponseEntity<CashflowStatementDTO> getCashflowStatement(@PathVariable UUID periodId) {
        log.info("Getting cashflow statement for period {}", periodId);
        CashflowStatementDTO statement = reportService.generateCashflowStatement(periodId);
        return ResponseEntity.ok(statement);
    }

    /**
     * Get cashflow comparison across multiple periods
     */
    @GetMapping("/comparison")
    public ResponseEntity<List<CashflowStatementDTO>> getCashflowComparison(
            @RequestParam UUID orgId,
            @RequestParam int year) {
        log.info("Getting cashflow comparison for org {} year {}", orgId, year);
        List<CashflowStatementDTO> comparison = reportService.getCashflowComparison(orgId, year);
        return ResponseEntity.ok(comparison);
    }

    /**
     * Get cashflow summary for dashboard
     */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getCashflowSummary(@RequestParam UUID orgId) {
        log.info("Getting cashflow summary for org {}", orgId);
        Map<String, Object> summary = reportService.getCashflowSummary(orgId);
        return ResponseEntity.ok(summary);
    }

    /**
     * Get late entries report
     */
    @GetMapping("/late-entries")
    public ResponseEntity<Map<String, Object>> getLateEntriesReport(@RequestParam UUID orgId) {
        log.info("Getting late entries report for org {}", orgId);
        Map<String, Object> report = reportService.getLateEntriesReport(orgId);
        return ResponseEntity.ok(report);
    }

    /**
     * Validate cashflow formulas for a period
     */
    @GetMapping("/validate/{periodId}")
    public ResponseEntity<Map<String, Object>> validateCashflowFormulas(@PathVariable UUID periodId) {
        log.info("Validating cashflow formulas for period {}", periodId);
        Map<String, Object> validation = reportService.validateCashflowFormulas(periodId);
        return ResponseEntity.ok(validation);
    }

    /**
     * Get expense trends analysis
     */
    @GetMapping("/expense-trends")
    public ResponseEntity<Map<String, Object>> getExpenseTrends(
            @RequestParam UUID orgId,
            @RequestParam int year) {
        log.info("Getting expense trends for org {} year {}", orgId, year);
        Map<String, Object> trends = reportService.getExpenseTrends(orgId, year);
        return ResponseEntity.ok(trends);
    }
}
