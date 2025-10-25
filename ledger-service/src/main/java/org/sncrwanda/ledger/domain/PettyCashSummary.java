package org.sncrwanda.ledger.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "petty_cash_summary")
@Getter
@Setter
public class PettyCashSummary {
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CashflowPeriod period;
    
    @Column(name = "opening_balance", precision = 15, scale = 2)
    private BigDecimal openingBalance = BigDecimal.ZERO;
    
    @Column(name = "total_in", precision = 15, scale = 2)
    private BigDecimal totalIn = BigDecimal.ZERO;
    
    @Column(name = "total_out", precision = 15, scale = 2)
    private BigDecimal totalOut = BigDecimal.ZERO;
    
    // Closing balance calculated via database (GENERATED column)
    @Column(name = "closing_balance", insertable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal closingBalance;
    
    @Column(name = "carried_forward", precision = 15, scale = 2)
    private BigDecimal carriedForward;
    
    @Column(name = "carried_forward_date")
    private LocalDateTime carriedForwardDate;
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
