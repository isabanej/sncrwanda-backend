package org.sncrwanda.hr.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.domain.Branch;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class BranchRepositoryTest {
    @Autowired BranchRepository repo;

    @Test
    void save_and_existsByName() {
        Branch b = Branch.builder().name("Main Branch").address("Kigali").build();
        repo.save(b);
        assertNotNull(b.getId());
        assertTrue(repo.existsByName("Main Branch"));
    }
}
