package org.sncrwanda.reporting.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ReportSummaryResponse {
    private long employeeCount;
    private long studentCount;
    private long transactionCount;
    private long studentReportCount;
    private BigDecimal totalTransactionAmount;
}
