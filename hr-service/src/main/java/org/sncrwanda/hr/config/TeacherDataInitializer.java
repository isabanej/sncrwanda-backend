package org.sncrwanda.hr.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.hr.domain.*;
import org.sncrwanda.hr.repository.EmployeeRepository;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class TeacherDataInitializer {
    private final EmployeeRepository employeeRepository;
    private final org.sncrwanda.hr.repository.DepartmentRepository departmentRepository;
    private final org.sncrwanda.hr.repository.BranchRepository branchRepository;

    @PostConstruct
    public void seedIfEmpty(){
        try {
            long teachers = employeeRepository.findActiveTeachers("teacher").size();
            if (teachers > 0) {
                log.debug("TeacherDataInitializer: teachers present count={}", teachers);
                return;
            }
            // Ensure branch & department placeholders
            Branch branch = branchRepository.findAll().stream().findFirst().orElseGet(() -> {
                Branch b = new Branch();
                b.setName("Main Branch");
                b.setAddress("Kigali");
                return branchRepository.save(b);
            });
            Department dept = departmentRepository.findAll().stream().findFirst().orElseGet(() -> {
                Department d = new Department();
                d.setName("General");
                d.setBranch(branch);
                return departmentRepository.save(d);
            });
            // Seed a demo teacher employee
            Employee e = new Employee();
            e.setFullName("John Teacher");
            e.setDob(LocalDate.of(1990,5,1));
            e.setAddress("Kigali");
            e.setPosition("TEACHER");
            e.setSalary(new BigDecimal("1200"));
            e.setPhone("0788111111");
            e.setEmail("jteach@example.com");
            e.setActive(true);
            e.setDepartment(dept);
            e.setBranch(branch);
            employeeRepository.save(e);
            log.info("TeacherDataInitializer: seeded demo teacher for empty database");
        } catch (Exception ex) {
            log.warn("TeacherDataInitializer: seeding skipped due to error: {}", ex.toString());
        }
    }
}
