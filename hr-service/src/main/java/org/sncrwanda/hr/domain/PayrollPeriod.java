package org.sncrwanda.hr.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payroll_periods", uniqueConstraints = {
        @UniqueConstraint(name = "uk_payroll_period_branch_month", columnNames = {"branch_id", "period_year", "period_month"})
}, indexes = {
        @Index(name = "idx_payroll_period_branch", columnList = "branch_id"),
        @Index(name = "idx_payroll_period_ym", columnList = "period_year,period_month")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollPeriod {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(name = "period_year", nullable = false)
    private int year;

    @Column(name = "period_month", nullable = false)
    private int month; // 1-12

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20, columnDefinition = "varchar(20)")
    @Builder.Default
    private Status status = Status.DRAFT;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "approved_by")
    private UUID approvedBy;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "paid_by")
    private UUID paidBy;

    @Column(name = "paid_at")
    private OffsetDateTime paidAt;

    public enum Status { DRAFT, APPROVED, PAID }
}
