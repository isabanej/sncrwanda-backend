package org.sncrwanda.ledger.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "staff_payroll")
@Getter
@Setter
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class StaffPayroll {
    
    @Id
    @GeneratedValue
    private UUID id;
    
    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "period_id", nullable = false)
    private CashflowPeriod period;
    
    @Column(name = "employee_id", nullable = false)
    private UUID employeeId;
    
    @Column(name = "employee_name", nullable = false)
    private String employeeName;
    
    @Column(length = 100)
    private String position;
    
    @Column(name = "base_salary", nullable = false, precision = 15, scale = 2)
    private BigDecimal baseSalary;
    
    @Column(precision = 15, scale = 2)
    private BigDecimal bonuses = BigDecimal.ZERO;
    
    @Column(precision = 15, scale = 2)
    private BigDecimal deductions = BigDecimal.ZERO;
    
    // Net salary calculated via database (GENERATED column)
    @Column(name = "net_salary", insertable = false, updatable = false, precision = 15, scale = 2)
    private BigDecimal netSalary;
    
    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;
    
    @Column(name = "payment_method", length = 50)
    private String paymentMethod;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @Column(name = "edit_count")
    private Integer editCount = 0;
    
    @Column(name = "edit_attempts_remaining")
    private Integer editAttemptsRemaining = 3;
    
    @Column(name = "last_edited")
    private LocalDateTime lastEdited;
    
    @Column(name = "is_late_entry")
    private Boolean isLateEntry = false;
    
    @Column(name = "recorded_at")
    private LocalDateTime recordedAt = LocalDateTime.now();
    
    @Column(name = "recorded_by")
    private String recordedBy; // Changed from UUID to String to match auth user IDs (bigint)
    
    @Column(name = "org_id", nullable = false)
    private UUID orgId = UUID.fromString("00000000-0000-0000-0000-000000000001");
}
