package org.sncrwanda.student.repo;
import org.sncrwanda.student.domain.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import java.util.List;
import java.time.Instant;
public interface StudentRepo extends JpaRepository<Student, UUID> {
    List<Student> findByBranchId(UUID branchId);
    List<Student> findByGuardian_Id(UUID guardianId);
    Page<Student> findByBranchId(UUID branchId, Pageable pageable);
    Page<Student> findByGuardian_Id(UUID guardianId, Pageable pageable);

    @Query("select s from Student s where s.isDeleted = false")
    List<Student> findAllActive();

    @Query("select s from Student s where s.isDeleted = true")
    List<Student> findAllArchived();

    @Query("select s from Student s where s.branchId = ?1 and s.isDeleted = false")
    List<Student> findByBranchIdActive(UUID branchId);

    @Query("select s from Student s where s.branchId = ?1 and s.isDeleted = true")
    List<Student> findByBranchIdArchived(UUID branchId);

    @Transactional
    @Modifying
    @Query("update Student s set s.isDeleted = true, s.deletedAt = ?5, s.deletedBy = ?2, s.deletedByName = ?3, s.deletedByPhone = ?4 where s.id = ?1 and s.isDeleted = false")
    int softDelete(UUID id, UUID deletedBy, String deletedByName, String deletedByPhone, Instant deletedAt);

    @Transactional
    @Modifying
    @Query("update Student s set s.isDeleted = false, s.deletedAt = null, s.deletedBy = null, s.deletedByName = null, s.deletedByPhone = null where s.id = ?1 and s.isDeleted = true")
    int restore(UUID id);
}
