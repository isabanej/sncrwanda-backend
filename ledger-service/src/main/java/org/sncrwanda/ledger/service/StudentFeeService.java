package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.domain.StudentFeePayment;
import org.sncrwanda.ledger.repo.StudentFeePaymentRepo;
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
public class StudentFeeService {

    private final StudentFeePaymentRepo feePaymentRepo;
    private final CashflowPeriodService periodService;

    /**
     * Record a student fee payment
     */
    @Transactional
    public StudentFeePayment recordFeePayment(
            UUID periodId,
            UUID studentId,
            String studentName,
            String feeType,
            BigDecimal amountPaid,
            LocalDate paymentDate,
            String paymentMethod,
            String receiptNumber,
            UUID recordedBy) {
        
        // Validate period
        periodService.validatePeriodForEntry(periodId);
        
        // Check if payment already exists for this student in this period
        Optional<StudentFeePayment> existing = feePaymentRepo.findByPeriodIdAndStudentId(periodId, studentId);
        if (existing.isPresent()) {
            throw new IllegalStateException(
                "Fee payment already recorded for student " + studentName + " in this period. Use update instead.");
        }
        
        // Get period entity
        CashflowPeriod period = periodService.getPeriodById(periodId);
        
        // Create payment record
        StudentFeePayment payment = new StudentFeePayment();
        payment.setId(UUID.randomUUID());
        payment.setPeriod(period);
        payment.setStudentId(studentId);
        payment.setStudentName(studentName);
        payment.setFeeType(feeType);
        payment.setAmountPaid(amountPaid);
        payment.setPaymentDate(paymentDate);
        payment.setPaymentMethod(paymentMethod);
        payment.setReceiptNumber(receiptNumber);
        payment.setRecordedBy(recordedBy);
        payment.setRecordedAt(LocalDateTime.now());
        
        // Check if this is a late entry
        payment.setIsLateEntry(periodService.isLateEntry(period));
        
        // Initialize edit tracking
        payment.setEditCount(0);
        payment.setEditAttemptsRemaining(3);
        
        StudentFeePayment saved = feePaymentRepo.save(payment);
        log.info("Recorded fee payment for student {} in period {}: {} RWF", 
            studentName, periodId, amountPaid);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(periodId);
        
        return saved;
    }

    /**
     * Update an existing fee payment (with edit attempt tracking)
     */
    @Transactional
    public StudentFeePayment updateFeePayment(
            UUID paymentId,
            BigDecimal newAmount,
            LocalDate newPaymentDate,
            String newPaymentMethod,
            String newReceiptNumber,
            UUID updatedBy) {
        
        StudentFeePayment payment = feePaymentRepo.findById(paymentId)
            .orElseThrow(() -> new IllegalArgumentException("Payment not found: " + paymentId));
        
        // Check edit attempts remaining
        if (payment.getEditAttemptsRemaining() <= 0) {
            throw new IllegalStateException(
                "No edit attempts remaining for this payment. Contact administrator for assistance.");
        }
        
        // Validate period is still open
        periodService.validatePeriodForEntry(payment.getPeriod().getId());
        
        // Update fields
        payment.setAmountPaid(newAmount);
        payment.setPaymentDate(newPaymentDate);
        payment.setPaymentMethod(newPaymentMethod);
        payment.setReceiptNumber(newReceiptNumber);
        
        // Increment edit count and decrement attempts remaining
        payment.setEditCount(payment.getEditCount() + 1);
        payment.setEditAttemptsRemaining(payment.getEditAttemptsRemaining() - 1);
        payment.setLastEdited(LocalDateTime.now());
        
        StudentFeePayment saved = feePaymentRepo.save(payment);
        log.info("Updated fee payment {} (edits: {}/3) for student {} by user {}", 
            paymentId, payment.getEditCount(), payment.getStudentName(), updatedBy);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(payment.getPeriod().getId());
        
        return saved;
    }

    /**
     * Get all fee payments for a period
     */
    public List<StudentFeePayment> getFeePaymentsForPeriod(UUID periodId) {
        return feePaymentRepo.findByPeriodId(periodId);
    }

    /**
     * Get fee payment for specific student in period
     */
    public Optional<StudentFeePayment> getFeePaymentForStudent(UUID periodId, UUID studentId) {
        return feePaymentRepo.findByPeriodIdAndStudentId(periodId, studentId);
    }

    /**
     * Get all late entries
     */
    public List<StudentFeePayment> getLateEntries() {
        return feePaymentRepo.findByIsLateEntry(true);
    }

    /**
     * Get payments with no edit attempts remaining (need admin intervention)
     */
    public List<StudentFeePayment> getPaymentsNeedingAdminHelp() {
        return feePaymentRepo.findWithNoEditAttemptsRemaining();
    }

    /**
     * Calculate total fees collected for a period
     */
    public BigDecimal calculateTotalFees(UUID periodId) {
        return feePaymentRepo.calculateTotalForPeriod(periodId);
    }
}
