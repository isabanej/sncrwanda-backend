package org.sncrwanda.hr.dto;

import lombok.Data;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class EmployeeEvaluationRequest {
    @NotNull
    private UUID employeeId;
    @NotNull
    private UUID evaluatorId;
    @NotNull
    private Integer score;
    private String comments;
    private String improvementPlan;
    private LocalDate date;
    private UUID branchId;
}
