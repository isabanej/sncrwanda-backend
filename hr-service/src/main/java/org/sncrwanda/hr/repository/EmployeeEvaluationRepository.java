package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.EmployeeEvaluation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface EmployeeEvaluationRepository extends JpaRepository<EmployeeEvaluation, UUID> {
    List<EmployeeEvaluation> findByEmployeeId(UUID employeeId);
    List<EmployeeEvaluation> findByBranchId(UUID branchId);
    Page<EmployeeEvaluation> findByBranchId(UUID branchId, Pageable pageable);
    Page<EmployeeEvaluation> findByEmployeeId(UUID employeeId, Pageable pageable);
    Page<EmployeeEvaluation> findByEmployeeIdAndBranchId(UUID employeeId, UUID branchId, Pageable pageable);
}
