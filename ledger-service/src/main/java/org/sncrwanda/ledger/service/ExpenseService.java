package org.sncrwanda.ledger.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.ledger.domain.CashflowPeriod;
import org.sncrwanda.ledger.domain.CashflowExpense;
import org.sncrwanda.ledger.domain.ExpenseCategory;
import org.sncrwanda.ledger.repo.CashflowExpenseRepo;
import org.sncrwanda.ledger.repo.ExpenseCategoryRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {

    private final CashflowExpenseRepo expenseRepo;
    private final ExpenseCategoryRepo categoryRepo;
    private final CashflowPeriodService periodService;

    /**
     * Record an expense (unlimited entries allowed)
     */
    @Transactional
    public CashflowExpense recordExpense(
            UUID periodId,
            String category,
            BigDecimal amount,
            LocalDate transactionDate,
            String description,
            String receiptNumber,
            String paymentMethod,
            String vendorName,
            UUID recordedBy) {
        
        // Validate period
        periodService.validatePeriodForEntry(periodId);
        
        // Validate category exists
        categoryRepo.findByCategoryName(category)
            .orElseThrow(() -> new IllegalArgumentException("Invalid expense category: " + category));
        
        // Get period entity
        CashflowPeriod period = periodService.getPeriodById(periodId);
        
        // Create expense record
        CashflowExpense expense = new CashflowExpense();
        expense.setId(UUID.randomUUID());
        expense.setPeriod(period);
        expense.setCategory(category);
        expense.setAmount(amount);
        expense.setTransactionDate(transactionDate);
        expense.setDescription(description);
        expense.setReceiptNumber(receiptNumber);
        expense.setPaymentMethod(paymentMethod);
        expense.setVendorName(vendorName);
        expense.setRecordedBy(recordedBy);
        expense.setRecordedAt(LocalDateTime.now());
        
        // Check if this is a late entry
        expense.setIsLateEntry(periodService.isLateEntry(period));
        
        CashflowExpense saved = expenseRepo.save(expense);
        log.info("Recorded expense in category '{}' for period {}: {} RWF", 
            category, periodId, amount);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(periodId);
        
        return saved;
    }

    /**
     * Update an expense (no edit limit for expenses)
     */
    @Transactional
    public CashflowExpense updateExpense(
            UUID expenseId,
            String category,
            BigDecimal amount,
            LocalDate transactionDate,
            String description,
            String receiptNumber,
            String paymentMethod,
            String vendorName,
            UUID updatedBy) {
        
        CashflowExpense expense = expenseRepo.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Expense not found: " + expenseId));
        
        // Validate period is still open
        periodService.validatePeriodForEntry(expense.getPeriod().getId());
        
        // Validate category exists
        categoryRepo.findByCategoryName(category)
            .orElseThrow(() -> new IllegalArgumentException("Invalid expense category: " + category));
        
        // Update fields
        expense.setCategory(category);
        expense.setAmount(amount);
        expense.setTransactionDate(transactionDate);
        expense.setDescription(description);
        expense.setReceiptNumber(receiptNumber);
        expense.setPaymentMethod(paymentMethod);
        expense.setVendorName(vendorName);
        
        CashflowExpense saved = expenseRepo.save(expense);
        log.info("Updated expense {} by user {}", expenseId, updatedBy);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(expense.getPeriod().getId());
        
        return saved;
    }

    /**
     * Delete an expense
     */
    @Transactional
    public void deleteExpense(UUID expenseId) {
        CashflowExpense expense = expenseRepo.findById(expenseId)
            .orElseThrow(() -> new IllegalArgumentException("Expense not found: " + expenseId));
        
        // Validate period is still open
        periodService.validatePeriodForEntry(expense.getPeriod().getId());
        
        UUID periodId = expense.getPeriod().getId();
        expenseRepo.delete(expense);
        
        log.info("Deleted expense {}", expenseId);
        
        // Recalculate period ending cash
        periodService.recalculateEndingCash(periodId);
    }

    /**
     * Get all expenses for a period
     */
    public List<CashflowExpense> getExpensesForPeriod(UUID periodId) {
        return expenseRepo.findByPeriodId(periodId);
    }

    /**
     * Get expenses by category
     */
    public List<CashflowExpense> getExpensesByCategory(String category) {
        return expenseRepo.findByCategory(category);
    }

    /**
     * Get expenses for period by category
     */
    public List<CashflowExpense> getExpensesForPeriodByCategory(UUID periodId, String category) {
        return expenseRepo.findByPeriodIdAndCategory(periodId, category);
    }

    /**
     * Get expenses within date range
     */
    public List<CashflowExpense> getExpensesByDateRange(LocalDate start, LocalDate end) {
        return expenseRepo.findByTransactionDateBetween(start, end);
    }

    /**
     * Calculate total expenses for a period
     */
    public BigDecimal calculateTotalExpenses(UUID periodId) {
        return expenseRepo.calculateTotalForPeriod(periodId);
    }

    /**
     * Get expense totals grouped by category for a period
     */
    public List<Object[]> getExpensesByCategory(UUID periodId) {
        return expenseRepo.sumByCategory(periodId);
    }

    /**
     * Get all active expense categories
     */
    public List<ExpenseCategory> getActiveCategories() {
        return categoryRepo.findByIsActiveOrderByDisplayOrder(true);
    }

    /**
     * Create a new user-defined expense category
     */
    @Transactional
    public ExpenseCategory createCategory(String categoryName, UUID createdBy) {
        // Check if category already exists
        if (categoryRepo.findByCategoryName(categoryName).isPresent()) {
            throw new IllegalArgumentException("Category already exists: " + categoryName);
        }
        
        ExpenseCategory category = new ExpenseCategory();
        category.setId(UUID.randomUUID());
        category.setCategoryName(categoryName);
        category.setIsSystemDefined(false); // User-created
        category.setIsActive(true);
        category.setDisplayOrder(999); // User categories at bottom
        category.setCreatedBy(createdBy);
        category.setCreatedAt(LocalDateTime.now());
        
        return categoryRepo.save(category);
    }
}
