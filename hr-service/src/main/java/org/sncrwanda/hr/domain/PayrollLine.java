package org.sncrwanda.hr.domain;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "payroll_lines", indexes = {
        @Index(name = "idx_payroll_line_entry", columnList = "entry_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PayrollLine {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "entry_id", nullable = false)
    private PayrollEntry entry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LineType type; // EARNING or DEDUCTION

    @Column(nullable = false, length = 100)
    private String label;

    @Column(nullable = false, precision = 16, scale = 2)
    private BigDecimal amount;

    public enum LineType { EARNING, DEDUCTION }
}

