package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "student_fee_payments")
@Getter
@Setter
public class StudentFeePayment {
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CashflowPeriod period;
    
    @Column(name = "student_id", nullable = false)
    private UUID studentId;
    
    @Column(name = "student_name", nullable = false)
    private String studentName;
    
    @Column(name = "fee_type", length = 100)
    private String feeType; // "Home Schooling" or "SNC"
    
    @Column(name = "amount_paid", nullable = false, precision = 15, scale = 2)
    private BigDecimal amountPaid;
    
    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;
    
    @Column(name = "payment_method", length = 50)
    private String paymentMethod;
    
    @Column(name = "receipt_number", length = 100)
    private String receiptNumber;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "edit_count")
    private Integer editCount = 0;
    
    @Column(name = "edit_attempts_remaining")
    private Integer editAttemptsRemaining = 3;
    
    @Column(name = "last_edited")
    private LocalDateTime lastEdited;
    
    @Column(name = "is_late_entry")
    private Boolean isLateEntry = false;
    
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
    
    @Column(name = "recorded_by")
    private UUID recordedBy;
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
