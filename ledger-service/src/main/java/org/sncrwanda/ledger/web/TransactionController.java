package org.sncrwanda.ledger.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import org.sncrwanda.ledger.dto.TransactionRequest;
import org.sncrwanda.ledger.dto.TransactionResponse;
import org.sncrwanda.ledger.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/transactions")
@Tag(name = "Transaction", description = "Transaction management APIs")
public class TransactionController {
    @Autowired
    private TransactionService transactionService;

    @PostMapping
    @Operation(summary = "Create a transaction")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Transaction payload",
        required = true,
        content = @Content(mediaType = "application/json",
            schema = @Schema(implementation = TransactionRequest.class),
            examples = @ExampleObject(value = "{\"type\":\"INCOME\",\"category\":\"Tuition\",\"name\":\"Term fees\",\"materials\":[\"books\"],\"amount\":1500.00,\"txDate\":\"2025-09-17\",\"notes\":\"Test deposit\"}")
        )
    )
    public ResponseEntity<TransactionResponse> create(@Valid @RequestBody TransactionRequest req) {
        TransactionResponse resp = transactionService.create(req);
        return ResponseEntity.status(201).body(resp);
    }

    @GetMapping
    @Operation(summary = "List transactions")
    public List<TransactionResponse> list() {
        return transactionService.listAll();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get transaction by ID")
    public ResponseEntity<TransactionResponse> get(@PathVariable UUID id) {
        return transactionService.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update transaction")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Transaction payload",
        required = true,
        content = @Content(mediaType = "application/json",
            schema = @Schema(implementation = TransactionRequest.class),
            examples = @ExampleObject(value = "{\"type\":\"EXPENSE\",\"category\":\"Supplies\",\"name\":\"Stationery\",\"materials\":[],\"amount\":200.00,\"txDate\":\"2025-09-18\",\"notes\":\"Pens and paper\"}")
        )
    )
    public ResponseEntity<TransactionResponse> update(@PathVariable UUID id, @Valid @RequestBody TransactionRequest req) {
        return transactionService.update(id, req).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete transaction")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        boolean deleted = transactionService.delete(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
}
