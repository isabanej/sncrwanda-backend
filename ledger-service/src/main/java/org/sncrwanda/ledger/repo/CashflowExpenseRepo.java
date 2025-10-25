package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.CashflowExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CashflowExpenseRepo extends JpaRepository<CashflowExpense, UUID> {
    
    List<CashflowExpense> findByPeriodId(UUID periodId);
    
    List<CashflowExpense> findByCategory(String category);
    
    List<CashflowExpense> findByPeriodIdAndCategory(UUID periodId, String category);
    
    List<CashflowExpense> findByTransactionDateBetween(LocalDate startDate, LocalDate endDate);
    
    List<CashflowExpense> findByIsLateEntry(Boolean isLateEntry);
    
    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM CashflowExpense e WHERE e.period.id = :periodId")
    java.math.BigDecimal calculateTotalForPeriod(@Param("periodId") UUID periodId);
    
    @Query("SELECT SUM(e.amount) FROM CashflowExpense e WHERE e.period.id = :periodId")
    java.util.Optional<java.math.BigDecimal> sumAmountByPeriodId(@Param("periodId") UUID periodId);
    
    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0) FROM CashflowExpense e " +
           "WHERE e.period.id = :periodId GROUP BY e.category")
    List<Object[]> sumByCategory(@Param("periodId") UUID periodId);
}
