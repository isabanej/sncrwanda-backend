package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "cashflow_periods")
@Getter
@Setter
public class CashflowPeriod {
    
    public enum PeriodStatus {
        OPEN,              // Current month - can record freely
        LATE_ENTRY_PERIOD, // 1-5 days into next month - entries marked as late
        CLOSED,            // Past periods (after 5 days) - cannot add/edit
        LOCKED             // Future periods - cannot add/edit
    }
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @Column(nullable = false)
    private Integer year;
    
    @Column(nullable = false)
    private Integer month;
    
    @Column(name = "period_name", nullable = false, length = 50)
    private String periodName;
    
    @Column(name = "beginning_cash", nullable = false, precision = 15, scale = 2)
    private BigDecimal beginningCash = BigDecimal.ZERO;
    
    @Column(name = "ending_cash", nullable = false, precision = 15, scale = 2)
    private BigDecimal endingCash = BigDecimal.ZERO;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PeriodStatus status = PeriodStatus.OPEN;
    
    @Column(name = "locked_date")
    private LocalDateTime lockedDate;
    
    @Column(name = "late_entry_deadline")
    private LocalDateTime lateEntryDeadline;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "created_by")
    private UUID createdBy;
    
    @Column(name = "last_updated")
    private LocalDateTime lastUpdated;
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastUpdated = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
