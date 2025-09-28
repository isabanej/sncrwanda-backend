package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface DepartmentRepository extends JpaRepository<Department, UUID> {
    boolean existsByName(String name);
}

