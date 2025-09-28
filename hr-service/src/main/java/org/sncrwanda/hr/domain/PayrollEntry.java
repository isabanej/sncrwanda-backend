package org.sncrwanda.hr.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "payroll_entries", indexes = {
        @Index(name = "idx_payroll_entry_period", columnList = "period_id"),
        @Index(name = "idx_payroll_entry_employee", columnList = "employee_id"),
        @Index(name = "idx_payroll_entry_branch", columnList = "branch_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollEntry {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private PayrollPeriod period;

    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;

    @Column(name = "branch_id", nullable = false)
    private UUID branchId;

    @Column(nullable = false, precision = 16, scale = 2)
    private BigDecimal grossSalary;

    @Column(nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal allowances = BigDecimal.ZERO;

    @Column(nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal deductions = BigDecimal.ZERO;

    @Column(nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal netPay = BigDecimal.ZERO;

    @Column(length = 500)
    private String notes;

    @Builder.Default
    private boolean paid = false;

    private OffsetDateTime paidAt;

    @PrePersist
    @PreUpdate
    public void recalcNet() {
        if (grossSalary == null) grossSalary = BigDecimal.ZERO;
        if (allowances == null) allowances = BigDecimal.ZERO;
        if (deductions == null) deductions = BigDecimal.ZERO;
        this.netPay = grossSalary.add(allowances).subtract(deductions);
    }
}

