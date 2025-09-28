package org.sncrwanda.hr.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.EmployeeEvaluation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class EmployeeEvaluationRepositoryTest {
    @Autowired EmployeeEvaluationRepository repo;

    @Test
    void save_and_query_by_branch_and_employee() {
        UUID branchId = UUID.randomUUID();
        UUID employeeId = UUID.randomUUID();
        EmployeeEvaluation ee = EmployeeEvaluation.builder()
                .employeeId(employeeId)
                .evaluatorId(UUID.randomUUID())
                .score(4)
                .date(LocalDate.now())
                .branchId(branchId)
                .build();
        repo.save(ee);
        assertNotNull(ee.getId());
        List<EmployeeEvaluation> byBranch = repo.findByBranchId(branchId);
        assertEquals(1, byBranch.size());
        List<EmployeeEvaluation> byEmp = repo.findByEmployeeId(employeeId);
        assertEquals(1, byEmp.size());
    }
}
