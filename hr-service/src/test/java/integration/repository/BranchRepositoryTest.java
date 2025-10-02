package integration.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.hr.HrApplication;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.repository.BranchRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = HrApplication.class)
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
