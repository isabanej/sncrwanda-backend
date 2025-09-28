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
class EmployeeArchiveRestoreIT {
    @Autowired EmployeeRepository employeeRepository;
    @Autowired BranchRepository branchRepository;
    @Autowired DepartmentRepository departmentRepository;

    @Test
    void archiveAndRestoreFlow() {
        Branch branch = branchRepository.save(Branch.builder().name("B").address("Addr").build());
        Department dept = departmentRepository.save(Department.builder().name("D").branch(branch).build());
        Employee emp = employeeRepository.save(Employee.builder()
            .fullName("Archive User")
            .dob(LocalDate.of(1990,1,1))
            .address("Kigali")
            .position("TEACHER")
            .salary(new BigDecimal("1000"))
            .department(dept)
            .branch(branch)
            .build());

        List<Employee> active = employeeRepository.findByDeletedFalse();
        assertTrue(active.stream().anyMatch(e -> e.getId().equals(emp.getId())));

        // Soft delete manually (simulate service)
        emp.setDeleted(true);
        emp.setDeletedAt(java.time.Instant.now());
        employeeRepository.save(emp);

        List<Employee> afterArchive = employeeRepository.findByDeletedFalse();
        assertFalse(afterArchive.stream().anyMatch(e -> e.getId().equals(emp.getId())));
        List<Employee> archived = employeeRepository.findByDeletedTrue();
        assertTrue(archived.stream().anyMatch(e -> e.getId().equals(emp.getId())));

        // Restore
        emp.setDeleted(false);
        emp.setDeletedAt(null);
        employeeRepository.save(emp);

        List<Employee> afterRestore = employeeRepository.findByDeletedFalse();
        assertTrue(afterRestore.stream().anyMatch(e -> e.getId().equals(emp.getId())));
    }
}
