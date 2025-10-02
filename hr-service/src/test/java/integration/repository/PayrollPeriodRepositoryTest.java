package integration.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.HrApplication;
import org.sncrwanda.hr.domain.PayrollPeriod;
import org.sncrwanda.hr.repository.PayrollPeriodRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = HrApplication.class)
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
