package integration.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.HrApplication;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.domain.Department;
import org.sncrwanda.hr.repository.BranchRepository;
import org.sncrwanda.hr.repository.DepartmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = HrApplication.class)
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
