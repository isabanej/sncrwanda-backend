package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class UpdateFeePaymentRequest {
    private BigDecimal newAmount;
    private LocalDate newPaymentDate;
    private String newPaymentMethod;
    private String newReceiptNumber;
    private UUID updatedBy;
}
