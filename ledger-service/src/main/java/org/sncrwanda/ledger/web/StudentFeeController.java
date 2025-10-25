package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.StudentFeePayment;
import org.sncrwanda.ledger.service.StudentFeeService;
import org.sncrwanda.ledger.web.dto.StudentFeePaymentRequest;
import org.sncrwanda.ledger.web.dto.UpdateFeePaymentRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/fees")
@RequiredArgsConstructor
@Slf4j
public class StudentFeeController {

    private final StudentFeeService feeService;

    /**
     * Record a new student fee payment
     */
    @PostMapping
    public ResponseEntity<StudentFeePayment> recordFeePayment(@RequestBody StudentFeePaymentRequest request) {
        log.info("Recording fee payment for student {} in period {}", request.getStudentName(), request.getPeriodId());
        
        StudentFeePayment payment = feeService.recordFeePayment(
            request.getPeriodId(),
            request.getStudentId(),
            request.getStudentName(),
            request.getFeeType(),
            request.getAmountPaid(),
            request.getPaymentDate(),
            request.getPaymentMethod(),
            request.getReceiptNumber(),
            request.getRecordedBy()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(payment);
    }

    /**
     * Update an existing fee payment
     */
    @PutMapping("/{paymentId}")
    public ResponseEntity<StudentFeePayment> updateFeePayment(
            @PathVariable UUID paymentId,
            @RequestBody UpdateFeePaymentRequest request) {
        log.info("Updating fee payment {}", paymentId);
        
        StudentFeePayment payment = feeService.updateFeePayment(
            paymentId,
            request.getNewAmount(),
            request.getNewPaymentDate(),
            request.getNewPaymentMethod(),
            request.getNewReceiptNumber(),
            request.getUpdatedBy()
        );
        
        return ResponseEntity.ok(payment);
    }

    /**
     * Get all fee payments for a period
     */
    @GetMapping("/period/{periodId}")
    public ResponseEntity<List<StudentFeePayment>> getFeePaymentsForPeriod(@PathVariable UUID periodId) {
        log.info("Getting fee payments for period {}", periodId);
        List<StudentFeePayment> payments = feeService.getFeePaymentsForPeriod(periodId);
        return ResponseEntity.ok(payments);
    }

    /**
     * Get fee payment for specific student in period
     */
    @GetMapping("/period/{periodId}/student/{studentId}")
    public ResponseEntity<StudentFeePayment> getFeePaymentForStudent(
            @PathVariable UUID periodId,
            @PathVariable UUID studentId) {
        log.info("Getting fee payment for student {} in period {}", studentId, periodId);
        return feeService.getFeePaymentForStudent(periodId, studentId)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all late entries
     */
    @GetMapping("/late")
    public ResponseEntity<List<StudentFeePayment>> getLateEntries() {
        log.info("Getting late fee entries");
        List<StudentFeePayment> payments = feeService.getLateEntries();
        return ResponseEntity.ok(payments);
    }

    /**
     * Get payments needing admin help (no edits remaining)
     */
    @GetMapping("/need-admin-help")
    public ResponseEntity<List<StudentFeePayment>> getPaymentsNeedingAdminHelp() {
        log.info("Getting payments needing admin help");
        List<StudentFeePayment> payments = feeService.getPaymentsNeedingAdminHelp();
        return ResponseEntity.ok(payments);
    }

    /**
     * Calculate total fees for a period
     */
    @GetMapping("/period/{periodId}/total")
    public ResponseEntity<BigDecimal> calculateTotalFees(@PathVariable UUID periodId) {
        log.info("Calculating total fees for period {}", periodId);
        BigDecimal total = feeService.calculateTotalFees(periodId);
        return ResponseEntity.ok(total);
    }
}
