package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PayrollRequest {
    private UUID periodId;
    private UUID employeeId;
    private BigDecimal bonuses;
    private BigDecimal deductions;
    private String paymentMethod;
    private LocalDate paymentDate;
    private UUID recordedBy;
}
