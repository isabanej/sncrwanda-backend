package org.sncrwanda.hr.repository;

import org.sncrwanda.hr.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface BranchRepository extends JpaRepository<Branch, UUID> {
    boolean existsByName(String name);
}

