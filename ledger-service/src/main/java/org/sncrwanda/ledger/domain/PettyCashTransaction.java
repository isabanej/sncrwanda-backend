package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "petty_cash_transactions")
@Getter
@Setter
public class PettyCashTransaction {
    
    public enum TransactionType {
        IN, OUT
    }
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CashflowPeriod period;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 10)
    private TransactionType transactionType;
    
    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;
    
    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;
    
    @Column(length = 100)
    private String category;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "receipt_number", length = 100)
    private String receiptNumber;
    
    @Column(name = "handled_by")
    private String handledBy;
    
    @Column(name = "is_late_entry")
    private Boolean isLateEntry = false;
    
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
    
    @Column(name = "recorded_by")
    private UUID recordedBy;
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
