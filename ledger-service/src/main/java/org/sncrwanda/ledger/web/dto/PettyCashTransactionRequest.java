package org.sncrwanda.ledger.web.dto;

import lombok.Data;
import org.sncrwanda.ledger.domain.PettyCashTransaction.TransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class PettyCashTransactionRequest {
    private UUID periodId;
    private TransactionType transactionType;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private String category;
    private String description;
    private String receiptNumber;
    private String handledBy;
    private UUID recordedBy;
}
