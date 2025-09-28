package integration.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.domain.Department;
import org.sncrwanda.hr.domain.Employee;
import org.sncrwanda.hr.repository.BranchRepository;
import org.sncrwanda.hr.repository.DepartmentRepository;
import org.sncrwanda.hr.repository.EmployeeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class EmployeeOrderingTest {
    @Autowired EmployeeRepository employeeRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired DepartmentRepository departmentRepository;

    @Test
    void newestFirstOrderingByCreatedAt() throws InterruptedException {
        Branch branch = branchRepository.save(Branch.builder().name("B1").address("Addr").build());
        Department dept = departmentRepository.save(Department.builder().name("Dept1").branch(branch).build());

        Employee first = employeeRepository.save(Employee.builder()
                .fullName("Emp One").dob(LocalDate.of(1990,1,1)).address("A1")
                .position("TEACHER").salary(new BigDecimal("1000"))
                .department(dept).branch(branch)
                .build());
        // Ensure different createdAt timestamp ordering (DB granularity could be ms; brief sleep)
        Thread.sleep(5);
        Employee second = employeeRepository.save(Employee.builder()
                .fullName("Emp Two").dob(LocalDate.of(1992,2,2)).address("A2")
                .position("TEACHER").salary(new BigDecimal("1100"))
                .department(dept).branch(branch)
                .build());
        Thread.sleep(5);
        Employee third = employeeRepository.save(Employee.builder()
                .fullName("Emp Three").dob(LocalDate.of(1993,3,3)).address("A3")
                .position("TEACHER").salary(new BigDecimal("1200"))
                .department(dept).branch(branch)
                .build());

        List<Employee> activeDesc = employeeRepository.findByDeletedFalseOrderByCreatedAtDesc();
        assertTrue(activeDesc.size() >= 3);
        // Newest should be 'third'
        assertEquals(third.getId(), activeDesc.get(0).getId());
        // Oldest among inserted should appear after newer ones
        int idxFirst = -1, idxSecond = -1, idxThird = -1;
        for (int i=0;i<activeDesc.size();i++) {
            if (activeDesc.get(i).getId().equals(first.getId())) idxFirst = i;
            else if (activeDesc.get(i).getId().equals(second.getId())) idxSecond = i;
            else if (activeDesc.get(i).getId().equals(third.getId())) idxThird = i;
        }
        assertTrue(idxThird < idxSecond && idxSecond < idxFirst, "Order should be third < second < first (newest to oldest)");
    }
}
