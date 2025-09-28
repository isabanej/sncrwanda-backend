package org.sncrwanda.student.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class StudentReportResponse {
    private UUID id;
    private UUID studentId;
    private UUID teacherId;
    private String comments;
    private String improvementPlan;
    private String term;
    private LocalDate date;
    private UUID branchId;
}

