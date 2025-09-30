package unit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sncrwanda.student.domain.StudentReport;
import org.sncrwanda.student.repo.StudentReportRepo;
import org.sncrwanda.student.security.SecurityUtils;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.sncrwanda.student.service.StudentReportService;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class StudentReportServiceArchiveTest {

    StudentReportRepo repo;
    StudentReportService service;

    UUID branch = UUID.randomUUID();
    UUID teacher = UUID.randomUUID();

    @BeforeEach
    void setup(){
        repo = mock(StudentReportRepo.class);
        service = new StudentReportService();
        // inject mock (field is package-private in original code; using reflection)
        try {
            var f = StudentReportService.class.getDeclaredField("repo");
            f.setAccessible(true);
            f.set(service, repo);
        } catch (Exception e) { throw new RuntimeException(e); }

        // Mock static SecurityUtils through simple shim (would normally use wrapper or PowerMockito; here we assume
        // roles not directly enforced for archive/restore beyond branch checks already in service logic for non-admin).
    }

    private StudentReport newEntity(){
        StudentReport r = new StudentReport();
        r.setId(UUID.randomUUID());
        r.setStudentId(UUID.randomUUID());
        r.setTeacherId(teacher);
        r.setBranchId(branch);
        r.setDate(LocalDate.now());
        r.setArchived(false);
        return r;
    }

    @Test
    void soft_delete_marks_archived_true() {
        StudentReport r = newEntity();
        when(repo.findById(r.getId())).thenReturn(Optional.of(r));
        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(true);
            boolean result = service.delete(r.getId());
            assertTrue(result);
            assertTrue(r.isArchived());
            verify(repo, times(1)).save(r);
        }
    }

    @Test
    void restore_unsets_archived_flag() {
        StudentReport r = newEntity();
        r.setArchived(true);
        when(repo.findById(r.getId())).thenReturn(Optional.of(r));
        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(true);
            boolean result = service.restore(r.getId());
            assertTrue(result);
            assertFalse(r.isArchived());
            verify(repo).save(r);
        }
    }

}
