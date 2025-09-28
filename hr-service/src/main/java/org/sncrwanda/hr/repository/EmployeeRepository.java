package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    List<Employee> findByBranch_Id(UUID branchId);
    List<Employee> findByBranch_IdAndActiveTrue(UUID branchId);
    Optional<Employee> findByEmailIgnoreCase(String email);

    // Soft delete aware queries
    List<Employee> findByDeletedFalse();
    List<Employee> findByDeletedTrue();
    List<Employee> findByBranch_IdAndDeletedFalse(UUID branchId);
    List<Employee> findByBranch_IdAndDeletedTrue(UUID branchId);

    // Ordered queries (newest first)
    List<Employee> findByDeletedFalseOrderByCreatedAtDesc();
    List<Employee> findByDeletedTrueOrderByCreatedAtDesc();
    List<Employee> findByBranch_IdAndDeletedFalseOrderByCreatedAtDesc(UUID branchId);
    List<Employee> findByBranch_IdAndDeletedTrueOrderByCreatedAtDesc(UUID branchId);

    // Teacher position (case-insensitive substring) + soft delete aware, newest first
    @Query("select e from Employee e where e.deleted = false and lower(e.position) like concat('%', lower(:fragment), '%') order by e.createdAt desc")
    List<Employee> findActiveTeachers(@Param("fragment") String fragment);

    @Query("select e from Employee e where e.deleted = false and e.branch.id = :branchId and lower(e.position) like concat('%', lower(:fragment), '%') order by e.createdAt desc")
    List<Employee> findActiveTeachersByBranch(@Param("branchId") UUID branchId, @Param("fragment") String fragment);
}
