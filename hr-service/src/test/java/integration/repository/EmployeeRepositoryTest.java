package org.sncrwanda.hr.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.domain.Department;
import org.sncrwanda.hr.domain.Employee;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class EmployeeRepositoryTest {
    @Autowired EmployeeRepository repo;
    @Autowired BranchRepository branchRepo;
    @Autowired DepartmentRepository deptRepo;

    @Test
    void findByBranch_andActive() {
        Branch branch = branchRepo.save(Branch.builder().name("B").address("Addr").build());
        Department dept = deptRepo.save(Department.builder().name("D").branch(branch).build());
        Employee e = Employee.builder()
                .fullName("Jane Doe").dob(LocalDate.of(1990,1,1)).address("Kigali")
                .position("TEACHER").salary(new BigDecimal("1200"))
                .department(dept).branch(branch)
                .build();
        repo.save(e);
        List<Employee> list = repo.findByBranch_Id(branch.getId());
        assertFalse(list.isEmpty());
        List<Employee> active = repo.findByBranch_IdAndActiveTrue(branch.getId());
        assertEquals(1, active.size());
        assertEquals(e.getId(), active.get(0).getId());
    }
}
