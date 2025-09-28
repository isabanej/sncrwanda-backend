package org.sncrwanda.hr.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.domain.Department;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class DepartmentRepositoryTest {
    @Autowired DepartmentRepository deptRepo;
    @Autowired BranchRepository branchRepo;

    @Test
    void save_and_find() {
        Branch branch = branchRepo.save(Branch.builder().name("B1").address("Addr").build());
        Department d = Department.builder().name("D1").branch(branch).build();
        deptRepo.save(d);
        assertNotNull(d.getId());
        assertTrue(deptRepo.findById(d.getId()).isPresent());
    }
}
