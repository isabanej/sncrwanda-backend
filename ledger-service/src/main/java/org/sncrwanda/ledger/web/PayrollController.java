package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.StaffPayroll;
import org.sncrwanda.ledger.service.PayrollService;
import org.sncrwanda.ledger.web.dto.PayrollRequest;
import org.sncrwanda.ledger.web.dto.UpdatePayrollRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/payroll")
@RequiredArgsConstructor
@Slf4j
public class PayrollController {

    private final PayrollService payrollService;

    /**
     * Record payroll for an employee
     */
    @PostMapping
    public ResponseEntity<StaffPayroll> recordPayroll(@RequestBody PayrollRequest request) {
        log.info("Recording payroll for employee {} in period {}", request.getEmployeeId(), request.getPeriodId());
        
        StaffPayroll payroll = payrollService.recordPayroll(
            request.getPeriodId(),
            request.getEmployeeId(),
            request.getBonuses(),
            request.getDeductions(),
            request.getPaymentMethod(),
            request.getPaymentDate(),
            request.getRecordedBy()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(payroll);
    }

    /**
     * Update payroll record
     */
    @PutMapping("/{payrollId}")
    public ResponseEntity<StaffPayroll> updatePayroll(
            @PathVariable UUID payrollId,
            @RequestBody UpdatePayrollRequest request) {
        log.info("Updating payroll {}", payrollId);
        
        StaffPayroll payroll = payrollService.updatePayroll(
            payrollId,
            request.getNewBonuses(),
            request.getNewDeductions(),
            request.getNewPaymentMethod(),
            request.getNewPaymentDate(),
            request.getUpdatedBy()
        );
        
        return ResponseEntity.ok(payroll);
    }

    /**
     * Get all payroll records for a period
     */
    @GetMapping("/period/{periodId}")
    public ResponseEntity<List<StaffPayroll>> getPayrollForPeriod(@PathVariable UUID periodId) {
        log.info("Getting payroll for period {}", periodId);
        List<StaffPayroll> payrolls = payrollService.getPayrollForPeriod(periodId);
        return ResponseEntity.ok(payrolls);
    }

    /**
     * Get payroll for specific employee in period
     */
    @GetMapping("/period/{periodId}/employee/{employeeId}")
    public ResponseEntity<StaffPayroll> getPayrollForEmployee(
            @PathVariable UUID periodId,
            @PathVariable UUID employeeId) {
        log.info("Getting payroll for employee {} in period {}", employeeId, periodId);
        return payrollService.getPayrollForEmployee(periodId, employeeId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all late entries
     */
    @GetMapping("/late")
    public ResponseEntity<List<StaffPayroll>> getLateEntries() {
        log.info("Getting late payroll entries");
        List<StaffPayroll> payrolls = payrollService.getLateEntries();
        return ResponseEntity.ok(payrolls);
    }

    /**
     * Calculate total payroll for a period
     */
    @GetMapping("/period/{periodId}/total")
    public ResponseEntity<BigDecimal> calculateTotalPayroll(@PathVariable UUID periodId) {
        log.info("Calculating total payroll for period {}", periodId);
        BigDecimal total = payrollService.calculateTotalPayroll(periodId);
        return ResponseEntity.ok(total);
    }
}
