package org.sncrwanda.ledger.dto;

import lombok.Data;
import org.sncrwanda.ledger.domain.Transaction;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Data
public class TransactionResponse {
    private UUID id;
    private Transaction.TxType type;
    private String category;
    private String name;
    private Set<String> materials;
    private BigDecimal amount;
    private LocalDate txDate;
    private String notes;
    private UUID branchId;
}
