package org.sncrwanda.student.integration.jpa;

import org.junit.jupiter.api.Test;
import org.sncrwanda.student.domain.StudentReport;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class StudentReportJpaTest {
    @Autowired TestEntityManager em;

    @Test
    void persist_and_load_student_report() {
        StudentReport r = StudentReport.builder()
                .studentId(UUID.randomUUID())
                .teacherId(UUID.randomUUID())
                .comments("Good progress")
                .improvementPlan("More practice")
                .term("2025-Q3")
                .date(LocalDate.now())
                .branchId(UUID.randomUUID())
                .build();
        r = em.persistFlushFind(r);
        assertNotNull(r.getId());
        assertEquals("2025-Q3", r.getTerm());
        assertNotNull(r.getDate());
    }
}
