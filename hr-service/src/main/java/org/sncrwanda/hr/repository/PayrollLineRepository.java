package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.PayrollLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PayrollLineRepository extends JpaRepository<PayrollLine, UUID> {
    List<PayrollLine> findByEntry_Id(UUID entryId);
}

