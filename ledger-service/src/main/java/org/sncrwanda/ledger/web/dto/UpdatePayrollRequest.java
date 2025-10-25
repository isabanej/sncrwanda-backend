package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdatePayrollRequest {
    private BigDecimal newBonuses;
    private BigDecimal newDeductions;
    private String newPaymentMethod;
    private LocalDate newPaymentDate;
    private UUID updatedBy;
}
