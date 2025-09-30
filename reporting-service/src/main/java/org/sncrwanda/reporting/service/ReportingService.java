package org.sncrwanda.reporting.service;

import org.sncrwanda.reporting.dto.ReportSummaryResponse;
import org.sncrwanda.reporting.dto.StudentSummaryResponse;
import org.sncrwanda.reporting.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;

@Service
public class ReportingService {
    @Autowired
    private JdbcTemplate jdbc;

    public ReportSummaryResponse getSummary() {
        ReportSummaryResponse r = new ReportSummaryResponse();
        UUID branchId = SecurityUtils.getBranchId();
        boolean admin = SecurityUtils.isAdmin();

        String empSql = admin ? "select count(*) from hr.employees" : "select count(*) from hr.employees where branch_id = ?";
        String stuSql = admin ? "select count(*) from student.students" : "select count(*) from student.students where branch_id = ?";
        String txSql  = admin ? "select count(*) from ledger.transactions" : "select count(*) from ledger.transactions where branch_id = ?";
        String txSumSql = admin ? "select coalesce(sum(amount),0) from ledger.transactions" : "select coalesce(sum(amount),0) from ledger.transactions where branch_id = ?";
    // Student reports feature removed; report count set to 0
    String repSql = "select 0";

        Long employeeCount = queryForLong(empSql, branchId, admin);
        Long studentCount = queryForLong(stuSql, branchId, admin);
        Long transactionCount = queryForLong(txSql, branchId, admin);
        BigDecimal total = queryForBigDecimal(txSumSql, branchId, admin);
        Long reportCount = queryForLong(repSql, branchId, admin);

        r.setEmployeeCount(employeeCount != null ? employeeCount : 0);
        r.setStudentCount(studentCount != null ? studentCount : 0);
        r.setTransactionCount(transactionCount != null ? transactionCount : 0);
        r.setTotalTransactionAmount(total != null ? total : BigDecimal.ZERO);
        r.setStudentReportCount(reportCount != null ? reportCount : 0);
        return r;
    }

    public StudentSummaryResponse getStudentSummary() {
        StudentSummaryResponse s = new StudentSummaryResponse();
        java.util.UUID branchId = SecurityUtils.getBranchId();
        boolean admin = SecurityUtils.isAdmin();
        String totalSql = admin ? "select count(*) from student.students" : "select count(*) from student.students where branch_id = ?";
        String deletedSql = admin ? "select count(*) from student.students where is_deleted = true" : "select count(*) from student.students where is_deleted = true and branch_id = ?";
        Long total = queryForLong(totalSql, branchId, admin);
        Long deleted = queryForLong(deletedSql, branchId, admin);
        long t = total != null ? total : 0L;
        long d = deleted != null ? deleted : 0L;
        s.setTotalStudents(t);
        s.setDeletedStudents(d);
        s.setActiveStudents(Math.max(0, t - d));
        return s;
    }

    private Long queryForLong(String sql, UUID branchId, boolean admin) {
        try {
            if (admin) return jdbc.queryForObject(sql, Long.class);
            if (branchId == null) return 0L;
            return jdbc.queryForObject(sql, Long.class, branchId);
        } catch (Exception e) {
            return 0L;
        }
    }

    private BigDecimal queryForBigDecimal(String sql, UUID branchId, boolean admin) {
        try {
            if (admin) return jdbc.queryForObject(sql, BigDecimal.class);
            if (branchId == null) return BigDecimal.ZERO;
            return jdbc.queryForObject(sql, BigDecimal.class, branchId);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }
}
