package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.CashflowCashIn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;
import java.util.UUID;

public interface CashflowCashInRepo extends JpaRepository<CashflowCashIn, UUID> {
    
    Optional<CashflowCashIn> findByPeriodId(UUID periodId);
    
    @Query("SELECT SUM(c.totalCashIn) FROM CashflowCashIn c WHERE c.period.id = :periodId")
    Optional<java.math.BigDecimal> sumAmountByPeriodId(@Param("periodId") UUID periodId);
}
