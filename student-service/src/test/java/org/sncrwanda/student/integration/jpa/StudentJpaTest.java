package org.sncrwanda.student.integration.jpa;

import org.junit.jupiter.api.Test;
import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.domain.Need;
import org.sncrwanda.student.domain.Student;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class StudentJpaTest {
    @Autowired TestEntityManager em;

    @Test
    void persist_and_load_student_with_guardian_and_needs() {
        Guardian g = em.persistFlushFind(Guardian.builder()
                .fullName("Parent Two").phone("0788111111").email("p2@example.com").address("Kigali").build());
        Student s = Student.builder()
                .guardian(g)
                .childName("Child One")
                .childDob(LocalDate.of(2015, 5, 10))
                .branchId(UUID.fromString("00000000-0000-0000-0000-000000000001"))
        .orgId(UUID.randomUUID())
                .needs(Set.of(Need.PHYSICAL, Need.LEARNING))
                .build();
        s = em.persistFlushFind(s);
        assertNotNull(s.getId());
        assertEquals("Child One", s.getChildName());
        assertEquals(2, s.getNeeds().size());
        assertNotNull(s.getGuardian());
    }
}
