package org.sncrwanda.ledger.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.sncrwanda.ledger.domain.CashflowPeriod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CashflowPeriodWithTotalsDTO {
    
    private UUID id;
    private UUID orgId;
    private Integer year;
    private Integer month;
    private String periodName;
    private BigDecimal beginningCash;
    private BigDecimal endingCash;
    private String status;
    private LocalDateTime lockedDate;
    private LocalDateTime lateEntryDeadline;
    private LocalDateTime createdAt;
    private LocalDateTime lastUpdated;
    
    // Aggregated totals
    private BigDecimal totalIncome;
    private BigDecimal totalExpenses;
    private BigDecimal totalFees;
    
    /**
     * Create from CashflowPeriod entity
     */
    public static CashflowPeriodWithTotalsDTO from(CashflowPeriod period) {
        return CashflowPeriodWithTotalsDTO.builder()
                .id(period.getId())
                .orgId(period.getOrgId())
                .year(period.getYear())
                .month(period.getMonth())
                .periodName(period.getPeriodName())
                .beginningCash(period.getBeginningCash())
                .endingCash(period.getEndingCash())
                .status(period.getStatus().name())
                .lockedDate(period.getLockedDate())
                .lateEntryDeadline(period.getLateEntryDeadline())
                .createdAt(period.getCreatedAt())
                .lastUpdated(period.getLastUpdated())
                .totalIncome(BigDecimal.ZERO)
                .totalExpenses(BigDecimal.ZERO)
                .totalFees(BigDecimal.ZERO)
                .build();
    }
}
