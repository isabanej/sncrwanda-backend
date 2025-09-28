package org.sncrwanda.ledger.integration.jpa;

import org.junit.jupiter.api.Test;
import org.sncrwanda.ledger.domain.Transaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class TransactionJpaTest {
    @Autowired TestEntityManager em;

    @Test
    void persist_and_load_transaction() {
        Transaction tx = Transaction.builder()
                .type(Transaction.TxType.INCOME)
                .category("DONATION")
                .name("Fundraiser")
                .materials(Set.of("Book", "Pen"))
                .amount(new BigDecimal("250.00"))
                .txDate(LocalDate.now())
                .notes("Thanks")
                .branchId(UUID.fromString("00000000-0000-0000-0000-000000000001"))
                .build();
        tx = em.persistFlushFind(tx);
        assertNotNull(tx.getId());
        assertEquals("DONATION", tx.getCategory());
        assertEquals(2, tx.getMaterials().size());
        assertNotNull(tx.getTxDate());
    }
}
