package unit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sncrwanda.reporting.dto.StudentSummaryResponse;
import org.sncrwanda.reporting.security.SecurityUtils;
import org.sncrwanda.reporting.service.ReportingService;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentSummaryServiceTest {
    @Test
    void studentSummary_adminCounts() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ReportingService svc = new ReportingService();
        try { var f=ReportingService.class.getDeclaredField("jdbc"); f.setAccessible(true); f.set(svc, jdbc);} catch (Exception e){ throw new RuntimeException(e);}        
        try(MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(true);
            st.when(SecurityUtils::getBranchId).thenReturn(null);
            when(jdbc.queryForObject(startsWith("select count(*) from student.students"), eq(Long.class))).thenReturn(5L);
            when(jdbc.queryForObject(startsWith("select count(*) from student.students where is_deleted = true"), eq(Long.class))).thenReturn(2L);
            StudentSummaryResponse r = svc.getStudentSummary();
            assertEquals(5, r.getTotalStudents());
            assertEquals(2, r.getDeletedStudents());
            assertEquals(3, r.getActiveStudents());
        }
    }
}
