package integration.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.HrApplication;
import org.sncrwanda.hr.domain.PayrollEntry;
import org.sncrwanda.hr.domain.PayrollLine;
import org.sncrwanda.hr.domain.PayrollPeriod;
import org.sncrwanda.hr.repository.PayrollEntryRepository;
import org.sncrwanda.hr.repository.PayrollLineRepository;
import org.sncrwanda.hr.repository.PayrollPeriodRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = HrApplication.class)
@ActiveProfiles("test")
class PayrollLineRepositoryTest {
    @Autowired PayrollPeriodRepository periodRepo;
    @Autowired PayrollEntryRepository entryRepo;
    @Autowired PayrollLineRepository lineRepo;

    @Test
    void save_and_findByEntry() {
        UUID branch = UUID.randomUUID();
        PayrollPeriod p = periodRepo.save(PayrollPeriod.builder().branchId(branch).year(2025).month(9).build());
        PayrollEntry e = entryRepo.save(PayrollEntry.builder()
                .period(p)
                .employeeId(UUID.randomUUID())
                .branchId(branch)
                .grossSalary(new BigDecimal("1000.00"))
                .build());
        lineRepo.save(PayrollLine.builder().entry(e).type(PayrollLine.LineType.EARNING).label("Bonus").amount(new BigDecimal("50.00")).build());
        lineRepo.save(PayrollLine.builder().entry(e).type(PayrollLine.LineType.DEDUCTION).label("Tax").amount(new BigDecimal("10.00")).build());
        List<PayrollLine> lines = lineRepo.findByEntry_Id(e.getId());
        assertEquals(2, lines.size());
    }
}
