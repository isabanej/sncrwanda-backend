package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.dto.CashflowPeriodWithTotalsDTO;
import org.sncrwanda.ledger.service.CashflowPeriodService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/periods")
@RequiredArgsConstructor
@Slf4j
public class CashflowPeriodController {

    private final CashflowPeriodService periodService;

    /**
     * Get current period for organization
     */
    @GetMapping("/current")
    public ResponseEntity<CashflowPeriod> getCurrentPeriod(@RequestParam UUID orgId) {
        log.info("Getting current period for org {}", orgId);
        CashflowPeriod period = periodService.getCurrentPeriod(orgId);
        return ResponseEntity.ok(period);
    }

    /**
     * Get all periods for organization
     */
    @GetMapping
    public ResponseEntity<List<CashflowPeriod>> getAllPeriods(@RequestParam UUID orgId) {
        log.info("Getting all periods for org {}", orgId);
        List<CashflowPeriod> periods = periodService.getAllPeriods(orgId);
        return ResponseEntity.ok(periods);
    }

    /**
     * Get all periods with aggregated totals for organization
     */
    @GetMapping("/with-totals")
    public ResponseEntity<List<CashflowPeriodWithTotalsDTO>> getAllPeriodsWithTotals(@RequestParam UUID orgId) {
        log.info("Getting all periods with totals for org {}", orgId);
        List<CashflowPeriodWithTotalsDTO> periods = periodService.getAllPeriodsWithTotals(orgId);
        return ResponseEntity.ok(periods);
    }

    /**
     * Get specific period
     */
    @GetMapping("/{periodId}")
    public ResponseEntity<CashflowPeriod> getPeriod(@PathVariable UUID periodId) {
        log.info("Getting period {}", periodId);
        CashflowPeriod period = periodService.getPeriodById(periodId);
        return ResponseEntity.ok(period);
    }

    /**
     * Create or get period for specific month
     */
    @PostMapping
    public ResponseEntity<CashflowPeriod> getOrCreatePeriod(
            @RequestParam UUID orgId,
            @RequestParam int year,
            @RequestParam int month) {
        log.info("Getting or creating period {}-{} for org {}", year, month, orgId);
        CashflowPeriod period = periodService.getOrCreatePeriod(year, month, orgId);
        return ResponseEntity.ok(period);
    }

    /**
     * Lock a period manually (admin action)
     */
    @PostMapping("/{periodId}/lock")
    public ResponseEntity<Void> lockPeriod(
            @PathVariable UUID periodId,
            @RequestParam UUID userId) {
        log.info("Locking period {} by user {}", periodId, userId);
        periodService.lockPeriod(periodId, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Get late entry notification for a period
     */
    @GetMapping("/{periodId}/notification")
    public ResponseEntity<String> getLateEntryNotification(@PathVariable UUID periodId) {
        CashflowPeriod period = periodService.getPeriodById(periodId);
        String notification = periodService.getLateEntryNotification(period);
        if (notification == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(notification);
    }

    /**
     * Recalculate ending cash for a period
     */
    @PostMapping("/{periodId}/recalculate")
    public ResponseEntity<Void> recalculateEndingCash(@PathVariable UUID periodId) {
        log.info("Manually recalculating ending cash for period {}", periodId);
        periodService.recalculateEndingCash(periodId);
        return ResponseEntity.ok().build();
    }
}

