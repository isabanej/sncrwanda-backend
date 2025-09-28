package unit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sncrwanda.reporting.dto.ReportSummaryResponse;
import org.sncrwanda.reporting.security.SecurityUtils;
import org.sncrwanda.reporting.service.ReportingService;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReportingServiceTest {
    @Test
    void getSummary_adminAggregatesAll() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ReportingService svc = new ReportingService();
        // inject mock via reflection since field is package-private @Autowired
        try {
            var f = ReportingService.class.getDeclaredField("jdbc");
            f.setAccessible(true);
            f.set(svc, jdbc);
        } catch (Exception e) { throw new RuntimeException(e); }

        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(true);
            st.when(SecurityUtils::getBranchId).thenReturn(null);
            when(jdbc.queryForObject(startsWith("select count(*) from hr.employees"), eq(Long.class))).thenReturn(10L);
            when(jdbc.queryForObject(startsWith("select count(*) from student.students"), eq(Long.class))).thenReturn(20L);
            when(jdbc.queryForObject(startsWith("select count(*) from ledger.transactions"), eq(Long.class))).thenReturn(5L);
            when(jdbc.queryForObject(startsWith("select coalesce(sum(amount)"), eq(BigDecimal.class))).thenReturn(new BigDecimal("123.45"));
            when(jdbc.queryForObject(startsWith("select count(*) from student.student_reports"), eq(Long.class))).thenReturn(7L);

            ReportSummaryResponse r = svc.getSummary();
            assertEquals(10, r.getEmployeeCount());
            assertEquals(20, r.getStudentCount());
            assertEquals(5, r.getTransactionCount());
            assertEquals(new BigDecimal("123.45"), r.getTotalTransactionAmount());
            assertEquals(7, r.getStudentReportCount());
        }
    }

    @Test
    void getSummary_nonAdminUsesBranch() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        ReportingService svc = new ReportingService();
        try { var f = ReportingService.class.getDeclaredField("jdbc"); f.setAccessible(true); f.set(svc, jdbc);} catch (Exception e) { throw new RuntimeException(e);}
        UUID branch = UUID.randomUUID();
        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(false);
            st.when(SecurityUtils::getBranchId).thenReturn(branch);
            when(jdbc.queryForObject(contains("hr.employees"), eq(Long.class), eq(branch))).thenReturn(1L);
            when(jdbc.queryForObject(contains("student.students"), eq(Long.class), eq(branch))).thenReturn(2L);
            when(jdbc.queryForObject(contains("ledger.transactions"), eq(Long.class), eq(branch))).thenReturn(3L);
            when(jdbc.queryForObject(contains("sum(amount)"), eq(BigDecimal.class), eq(branch))).thenReturn(new BigDecimal("9.99"));
            when(jdbc.queryForObject(contains("student.student_reports"), eq(Long.class), eq(branch))).thenReturn(4L);

            ReportSummaryResponse r = svc.getSummary();
            assertEquals(1, r.getEmployeeCount());
            assertEquals(2, r.getStudentCount());
            assertEquals(3, r.getTransactionCount());
            assertEquals(new BigDecimal("9.99"), r.getTotalTransactionAmount());
            assertEquals(4, r.getStudentReportCount());
        }
    }
}

