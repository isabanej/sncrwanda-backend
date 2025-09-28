package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.PayrollPeriod;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, UUID> {
    Optional<PayrollPeriod> findByBranchIdAndYearAndMonth(UUID branchId, int year, int month);
    Page<PayrollPeriod> findByBranchId(UUID branchId, Pageable pageable);
    Page<PayrollPeriod> findByYearAndMonth(int year, int month, Pageable pageable);
}
