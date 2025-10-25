package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.PettyCashTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface PettyCashTransactionRepo extends JpaRepository<PettyCashTransaction, UUID> {
    
    List<PettyCashTransaction> findByPeriodId(UUID periodId);
    
    List<PettyCashTransaction> findByTransactionType(PettyCashTransaction.TransactionType type);
    
    List<PettyCashTransaction> findByPeriodIdAndTransactionType(
        UUID periodId, 
        PettyCashTransaction.TransactionType type
    );
    
    @Query("SELECT COALESCE(SUM(pct.amount), 0) FROM PettyCashTransaction pct " +
           "WHERE pct.period.id = :periodId AND pct.transactionType = :type")
    java.math.BigDecimal calculateTotalByType(
        @Param("periodId") UUID periodId, 
        @Param("type") PettyCashTransaction.TransactionType type
    );
    
    @Query("SELECT SUM(pct.amount) FROM PettyCashTransaction pct " +
           "WHERE pct.period.id = :periodId AND pct.transactionType = 'DISBURSEMENT'")
    java.util.Optional<java.math.BigDecimal> sumAmountByPeriodIdAndType(@Param("periodId") java.util.UUID periodId);
}
