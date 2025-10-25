package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import org.sncrwanda.ledger.domain.CashflowPeriod.PeriodStatus;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CashflowStatementDTO {
    // Period info
    private UUID periodId;
    private String periodName;
    private Integer year;
    private Integer month;
    private String status;
    
    // Beginning balance
    private BigDecimal beginningCash;
    
    // Cash IN
    private BigDecimal schoolFeesTotal;
    private BigDecimal otherCashIn;
    private BigDecimal pettyCashIn;
    private BigDecimal totalCashIn;
    
    // Cash available
    private BigDecimal cashAvailable;
    
    // Cash OUT
    private List<ExpenseByCategoryDTO> expensesByCategory;
    private BigDecimal totalExpenses;
    private BigDecimal totalPayroll;
    private BigDecimal pettyCashOut;
    private BigDecimal totalCashOut;
    
    // Ending balance
    private BigDecimal endingCash;
    
    // Validation
    private Boolean formulaValid;
}
