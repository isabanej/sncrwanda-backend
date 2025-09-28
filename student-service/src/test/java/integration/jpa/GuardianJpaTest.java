package integration.jpa;

import org.junit.jupiter.api.Test;
import org.sncrwanda.student.domain.Guardian;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class GuardianJpaTest {
    @Autowired TestEntityManager em;

    @Test
    void persist_and_load_guardian() {
        Guardian g = Guardian.builder()
                .fullName("Parent One")
                .phone("0788000000")
                .email("p1@example.com")
                .address("Kigali")
                .build();
        g = em.persistFlushFind(g);
        assertNotNull(g.getId());
        assertEquals("Parent One", g.getFullName());
    }
}
