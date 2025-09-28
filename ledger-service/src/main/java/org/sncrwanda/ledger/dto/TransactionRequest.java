package org.sncrwanda.ledger.dto;

import lombok.Data;
import org.sncrwanda.ledger.domain.Transaction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

@Data
public class TransactionRequest {
    @NotNull
    private Transaction.TxType type;
    @NotBlank
    private String category;
    private String name;
    private Set<String> materials;
    @NotNull
    private BigDecimal amount;
    private LocalDate txDate;
    private String notes;
    private UUID branchId;
}
