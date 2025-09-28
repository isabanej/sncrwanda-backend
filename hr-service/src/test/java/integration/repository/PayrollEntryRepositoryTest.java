package org.sncrwanda.hr.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.PayrollEntry;
import org.sncrwanda.hr.domain.PayrollPeriod;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class PayrollEntryRepositoryTest {
    @Autowired PayrollPeriodRepository periodRepo;
    @Autowired PayrollEntryRepository entryRepo;

    @Test
    void save_and_query_by_period_and_employee() {
        UUID branch = UUID.randomUUID();
        PayrollPeriod p = periodRepo.save(PayrollPeriod.builder().branchId(branch).year(2025).month(9).build());
        UUID employeeId = UUID.randomUUID();
        PayrollEntry e = PayrollEntry.builder()
                .period(p)
                .employeeId(employeeId)
                .branchId(branch)
                .grossSalary(new BigDecimal("1000.00"))
                .build();
        entryRepo.save(e);
        assertNotNull(e.getId());
        List<PayrollEntry> byPeriod = entryRepo.findByPeriod_Id(p.getId(), org.springframework.data.domain.Pageable.unpaged()).getContent();
        assertEquals(1, byPeriod.size());
        assertEquals(employeeId, byPeriod.get(0).getEmployeeId());
    }
}
