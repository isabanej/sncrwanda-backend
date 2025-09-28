package org.sncrwanda.student.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "student_reports", indexes = {
    @Index(name = "idx_student_reports_branch_id", columnList = "branch_id"),
    @Index(name = "idx_student_reports_student_id", columnList = "student_id"),
    @Index(name = "idx_student_reports_teacher_id", columnList = "teacher_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentReport {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "student_id", nullable = false)
    private UUID studentId;

    @Column(name = "teacher_id", nullable = false)
    private UUID teacherId;

    private String comments;

    private String improvementPlan;

    private String term; // e.g. 2025-Q1 or Term 1

    private LocalDate date;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Builder.Default
    @Column(name = "archived", nullable = false)
    private boolean archived = false;
}
