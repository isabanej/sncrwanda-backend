package org.sncrwanda.hr.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employee_evaluations", indexes = {
    @Index(name = "idx_emp_eval_branch_id", columnList = "branch_id"),
    @Index(name = "idx_emp_eval_employee_id", columnList = "employee_id"),
    @Index(name = "idx_emp_eval_evaluator_id", columnList = "evaluator_id"),
    @Index(name = "idx_emp_eval_date", columnList = "date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeEvaluation {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "evaluator_id", nullable = false)
    private UUID evaluatorId; // teacher who evaluated

    @Column(nullable = false)
    private int score; // e.g. 1-5

    private String comments;

    private String improvementPlan;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;
}
