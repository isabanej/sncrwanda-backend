package org.sncrwanda.student.repo;

import org.sncrwanda.student.domain.StudentReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface StudentReportRepo extends JpaRepository<StudentReport, UUID> {
    List<StudentReport> findByStudentId(UUID studentId);
    List<StudentReport> findByBranchId(UUID branchId);
    List<StudentReport> findByStudentIdIn(List<UUID> studentIds);
    Page<StudentReport> findByStudentId(UUID studentId, Pageable pageable);
    Page<StudentReport> findByBranchId(UUID branchId, Pageable pageable);
    Page<StudentReport> findByStudentIdIn(List<UUID> studentIds, Pageable pageable);

    // Archived variants
    Page<StudentReport> findByBranchIdAndArchived(UUID branchId, boolean archived, Pageable pageable);
    Page<StudentReport> findByArchived(boolean archived, Pageable pageable);
    List<StudentReport> findByBranchIdAndArchived(UUID branchId, boolean archived);
    List<StudentReport> findByArchived(boolean archived);
}
