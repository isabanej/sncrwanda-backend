package org.sncrwanda.ledger.web;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowExpense;
import org.sncrwanda.ledger.domain.ExpenseCategory;
import org.sncrwanda.ledger.service.ExpenseService;
import org.sncrwanda.ledger.web.dto.ExpenseRequest;
import org.sncrwanda.ledger.web.dto.UpdateExpenseRequest;
import org.sncrwanda.ledger.web.dto.CategoryRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/cashflow/expenses")
@RequiredArgsConstructor
@Slf4j
public class ExpenseController {

    private final ExpenseService expenseService;

    /**
     * Record a new expense
     */
    @PostMapping
    public ResponseEntity<CashflowExpense> recordExpense(@RequestBody ExpenseRequest request) {
        log.info("Recording expense in category '{}' for period {}", request.getCategory(), request.getPeriodId());
        
        CashflowExpense expense = expenseService.recordExpense(
            request.getPeriodId(),
            request.getCategory(),
            request.getAmount(),
            request.getTransactionDate(),
            request.getDescription(),
            request.getReceiptNumber(),
            request.getPaymentMethod(),
            request.getVendorName(),
            request.getRecordedBy()
        );
        
        return ResponseEntity.status(HttpStatus.CREATED).body(expense);
    }

    /**
     * Update an expense
     */
    @PutMapping("/{expenseId}")
    public ResponseEntity<CashflowExpense> updateExpense(
            @PathVariable UUID expenseId,
            @RequestBody UpdateExpenseRequest request) {
        log.info("Updating expense {}", expenseId);
        
        CashflowExpense expense = expenseService.updateExpense(
            expenseId,
            request.getCategory(),
            request.getAmount(),
            request.getTransactionDate(),
            request.getDescription(),
            request.getReceiptNumber(),
            request.getPaymentMethod(),
            request.getVendorName(),
            request.getUpdatedBy()
        );
        
        return ResponseEntity.ok(expense);
    }

    /**
     * Delete an expense
     */
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@PathVariable UUID expenseId) {
        log.info("Deleting expense {}", expenseId);
        expenseService.deleteExpense(expenseId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get all expenses for a period
     */
    @GetMapping("/period/{periodId}")
    public ResponseEntity<List<CashflowExpense>> getExpensesForPeriod(@PathVariable UUID periodId) {
        log.info("Getting expenses for period {}", periodId);
        List<CashflowExpense> expenses = expenseService.getExpensesForPeriod(periodId);
        return ResponseEntity.ok(expenses);
    }

    /**
     * Get expenses by category
     */
    @GetMapping("/category/{category}")
    public ResponseEntity<List<CashflowExpense>> getExpensesByCategory(@PathVariable String category) {
        log.info("Getting expenses for category '{}'", category);
        List<CashflowExpense> expenses = expenseService.getExpensesByCategory(category);
        return ResponseEntity.ok(expenses);
    }

    /**
     * Get expenses for period by category
     */
    @GetMapping("/period/{periodId}/category/{category}")
    public ResponseEntity<List<CashflowExpense>> getExpensesForPeriodByCategory(
            @PathVariable UUID periodId,
            @PathVariable String category) {
        log.info("Getting expenses for period {} in category '{}'", periodId, category);
        List<CashflowExpense> expenses = expenseService.getExpensesForPeriodByCategory(periodId, category);
        return ResponseEntity.ok(expenses);
    }

    /**
     * Get expenses by date range
     */
    @GetMapping("/date-range")
    public ResponseEntity<List<CashflowExpense>> getExpensesByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        log.info("Getting expenses from {} to {}", start, end);
        List<CashflowExpense> expenses = expenseService.getExpensesByDateRange(start, end);
        return ResponseEntity.ok(expenses);
    }

    /**
     * Calculate total expenses for a period
     */
    @GetMapping("/period/{periodId}/total")
    public ResponseEntity<BigDecimal> calculateTotalExpenses(@PathVariable UUID periodId) {
        log.info("Calculating total expenses for period {}", periodId);
        BigDecimal total = expenseService.calculateTotalExpenses(periodId);
        return ResponseEntity.ok(total);
    }

    /**
     * Get expense totals grouped by category
     */
    @GetMapping("/period/{periodId}/by-category")
    public ResponseEntity<List<Object[]>> getExpensesByCategory(@PathVariable UUID periodId) {
        log.info("Getting expense breakdown by category for period {}", periodId);
        List<Object[]> breakdown = expenseService.getExpensesByCategory(periodId);
        return ResponseEntity.ok(breakdown);
    }

    /**
     * Get all active expense categories
     */
    @GetMapping("/categories")
    public ResponseEntity<List<ExpenseCategory>> getActiveCategories() {
        log.info("Getting active expense categories");
        List<ExpenseCategory> categories = expenseService.getActiveCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * Create a new user-defined expense category
     */
    @PostMapping("/categories")
    public ResponseEntity<ExpenseCategory> createCategory(@RequestBody CategoryRequest request) {
        log.info("Creating new expense category: {}", request.getCategoryName());
        ExpenseCategory category = expenseService.createCategory(
            request.getCategoryName(),
            request.getCreatedBy()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(category);
    }
}
