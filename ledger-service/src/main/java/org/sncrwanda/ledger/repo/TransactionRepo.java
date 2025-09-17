package org.sncrwanda.ledger.repo;
import org.sncrwanda.ledger.domain.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface TransactionRepo extends JpaRepository<Transaction, UUID> {}
