package org.sncrwanda.hr.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.PayrollPeriod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class PayrollPeriodRepositoryTest {
    @Autowired PayrollPeriodRepository repo;

    @Test
    void save_and_findByBranch_and_byUnique() {
        UUID branch = UUID.randomUUID();
        PayrollPeriod p = PayrollPeriod.builder().branchId(branch).year(2025).month(9).build();
        repo.save(p);
        assertNotNull(p.getId());
        assertFalse(repo.findByBranchId(branch, org.springframework.data.domain.Pageable.unpaged()).isEmpty());
        assertTrue(repo.findByBranchIdAndYearAndMonth(branch, 2025, 9).isPresent());
    }
}
