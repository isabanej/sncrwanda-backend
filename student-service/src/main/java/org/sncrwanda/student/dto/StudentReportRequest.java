package org.sncrwanda.student.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class StudentReportRequest {
    @NotNull
    private UUID studentId;
    @NotNull
    private UUID teacherId;
    private String comments;
    private String improvementPlan;
    private String term;
    private LocalDate date;
    private UUID branchId; // optional, will be validated against JWT for non-admins
}

