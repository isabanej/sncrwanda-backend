package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cashflow_cash_in")
@Getter
@Setter
public class CashflowCashIn {
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CashflowPeriod period;
    
    @Column(name = "school_fees_total", precision = 15, scale = 2)
    private BigDecimal schoolFeesTotal = BigDecimal.ZERO;
    
    @Column(name = "other_cash_in", precision = 15, scale = 2)
    private BigDecimal otherCashIn = BigDecimal.ZERO;
    
    @Column(name = "other_cash_in_notes", columnDefinition = "TEXT")
    private String otherCashInNotes;
    
    @Column(name = "petty_cash_in", precision = 15, scale = 2)
    private BigDecimal pettyCashIn = BigDecimal.ZERO;
    
    @Column(name = "petty_cash_in_notes", columnDefinition = "TEXT")
    private String pettyCashInNotes;
    
    // Total calculated via database (GENERATED column)
    @Column(name = "total_cash_in", insertable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal totalCashIn;
    
    @Column(name = "school_fees_edit_count")
    private Integer schoolFeesEditCount = 0;
    
    @Column(name = "school_fees_last_edit")
    private LocalDateTime schoolFeesLastEdit;
    
    @Column(name = "other_cash_edit_count")
    private Integer otherCashEditCount = 0;
    
    @Column(name = "other_cash_last_edit")
    private LocalDateTime otherCashLastEdit;
    
    @Column(name = "is_late_entry")
    private Boolean isLateEntry = false;
    
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
    
    @Column(name = "recorded_by")
    private UUID recordedBy;
    
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated = LocalDateTime.now();
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
