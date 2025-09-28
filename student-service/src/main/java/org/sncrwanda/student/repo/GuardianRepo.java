package org.sncrwanda.student.repo;
import org.sncrwanda.student.domain.Guardian;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface GuardianRepo extends JpaRepository<Guardian, UUID> {
	@Query("select g from Guardian g where g.isDeleted = false")
	List<Guardian> findAllActive();

	@Query("select g from Guardian g where g.branchId = ?1 and g.isDeleted = false")
	List<Guardian> findByBranchIdActive(UUID branchId);

	@Transactional
	@Modifying
	@Query("update Guardian g set g.isDeleted = true, g.deletedAt = CURRENT_TIMESTAMP, g.deletedBy = ?2, g.deletedByName = ?3, g.deletedByPhone = ?4 where g.id = ?1 and g.isDeleted = false")
	int softDelete(UUID id, UUID deletedBy, String deletedByName, String deletedByPhone);

	@Query("select g from Guardian g where g.isDeleted = true")
	List<Guardian> findAllArchived();

	@Query("select g from Guardian g where g.branchId = ?1 and g.isDeleted = true")
	List<Guardian> findByBranchIdArchived(UUID branchId);

	@Transactional
	@Modifying
	@Query("update Guardian g set g.isDeleted = false, g.deletedAt = null, g.deletedBy = null, g.deletedByName = null, g.deletedByPhone = null where g.id = ?1 and g.isDeleted = true")
	int restore(UUID id);

	// Duplicate detection by name + phone (case-insensitive), optionally scoped by branch when provided
	@Query("select g from Guardian g where lower(g.fullName) = lower(?1) and lower(g.phone) = lower(?2) and g.isDeleted = false")
	List<Guardian> findActiveByNameAndPhone(String fullName, String phone);

	@Query("select g from Guardian g where lower(g.fullName) = lower(?1) and lower(g.phone) = lower(?2)")
	List<Guardian> findAnyByNameAndPhone(String fullName, String phone);

	@Query("select g from Guardian g where g.branchId = ?1 and lower(g.fullName) = lower(?2) and lower(g.phone) = lower(?3) and g.isDeleted = false")
	List<Guardian> findActiveByBranchAndNameAndPhone(UUID branchId, String fullName, String phone);

	@Query("select g from Guardian g where g.branchId = ?1 and lower(g.fullName) = lower(?2) and lower(g.phone) = lower(?3)")
	List<Guardian> findAnyByBranchAndNameAndPhone(UUID branchId, String fullName, String phone);

	// Name-only finders for Java-side normalized phone comparisons
	List<Guardian> findByFullNameIgnoreCaseAndIsDeletedFalse(String fullName);
	List<Guardian> findByFullNameIgnoreCase(String fullName);
	List<Guardian> findByBranchIdAndFullNameIgnoreCaseAndIsDeletedFalse(UUID branchId, String fullName);
	List<Guardian> findByBranchIdAndFullNameIgnoreCase(UUID branchId, String fullName);
}
