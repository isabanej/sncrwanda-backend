package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.PayrollEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PayrollEntryRepository extends JpaRepository<PayrollEntry, UUID> {
    Page<PayrollEntry> findByPeriod_Id(UUID periodId, Pageable pageable);
    Optional<PayrollEntry> findByPeriod_IdAndEmployeeId(UUID periodId, UUID employeeId);
}
