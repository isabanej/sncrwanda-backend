package org.sncrwanda.student.integration.jpa;

import org.junit.jupiter.api.Test;
import org.sncrwanda.student.domain.StudentReport;
import org.sncrwanda.student.repo.StudentReportRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class StudentReportArchivedFilterTest {

    @Autowired
    StudentReportRepo repo;

    @Test
    void archived_filter_returns_only_expected_records() {
        UUID branch = UUID.randomUUID();
        // Active report (default archived = false)
        StudentReport active = StudentReport.builder()
                .studentId(UUID.randomUUID())
                .teacherId(UUID.randomUUID())
                .comments("Active report")
                .term("2025-Q4")
                .date(LocalDate.now())
                .branchId(branch)
                .build();
        active = repo.save(active); // id assigned

        // Archived report
        StudentReport archived = StudentReport.builder()
                .studentId(UUID.randomUUID())
                .teacherId(UUID.randomUUID())
                .comments("Archived report")
                .term("2025-Q4")
                .date(LocalDate.now())
                .branchId(branch)
                .archived(true)
                .build();
        archived = repo.save(archived); // id assigned

        List<StudentReport> activeList = repo.findByArchived(false);
        List<StudentReport> archivedList = repo.findByArchived(true);

        final UUID activeId = active.getId();
        final UUID archivedId = archived.getId();
        assertTrue(activeList.stream().anyMatch(r -> r.getId().equals(activeId)), "Active report should be returned");
        assertFalse(activeList.stream().anyMatch(r -> r.getId().equals(archivedId)), "Archived report should not appear in active list");

        assertTrue(archivedList.stream().anyMatch(r -> r.getId().equals(archivedId)), "Archived report should be returned");
        assertFalse(archivedList.stream().anyMatch(r -> r.getId().equals(activeId)), "Active report should not appear in archived list");
    }
}
