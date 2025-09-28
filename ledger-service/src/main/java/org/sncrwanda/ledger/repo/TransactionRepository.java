package org.sncrwanda.ledger.repo;

import org.sncrwanda.ledger.domain.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, UUID> {
    List<Transaction> findByBranchId(UUID branchId);
}
