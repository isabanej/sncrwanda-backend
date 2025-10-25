package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cashflow_expenses")
@Getter
@Setter
public class CashflowExpense {
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CashflowPeriod period;
    
    @Column(nullable = false, length = 100)
    private String category;
    
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    
    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "receipt_number", length = 100)
    private String receiptNumber;
    
    @Column(name = "payment_method", length = 50)
    private String paymentMethod;
    
    @Column(name = "vendor_name")
    private String vendorName;
    
    @Column(name = "is_late_entry")
    private Boolean isLateEntry = false;
    
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
    
    @Column(name = "recorded_by")
    private UUID recordedBy;
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
