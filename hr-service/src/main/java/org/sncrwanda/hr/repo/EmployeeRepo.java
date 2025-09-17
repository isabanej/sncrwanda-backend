package org.sncrwanda.hr.repo;
import org.sncrwanda.hr.domain.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface EmployeeRepo extends JpaRepository<Employee, UUID> {}
