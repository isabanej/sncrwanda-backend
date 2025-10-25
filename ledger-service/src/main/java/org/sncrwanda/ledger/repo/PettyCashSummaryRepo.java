package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.PettyCashSummary;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface PettyCashSummaryRepo extends JpaRepository<PettyCashSummary, UUID> {
    
    Optional<PettyCashSummary> findByPeriodId(UUID periodId);
}
