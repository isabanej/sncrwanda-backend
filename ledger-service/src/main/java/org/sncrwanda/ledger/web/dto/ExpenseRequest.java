package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class ExpenseRequest {
    private UUID periodId;
    private String category;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private String description;
    private String receiptNumber;
    private String paymentMethod;
    private String vendorName;
    private String recordedBy; // Changed from UUID to String
}
