package org.sncrwanda.hr.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Builder
public class PayslipResponse {
    private int year;
    private int month;

    private UUID employeeId;
    private String employeeName;
    private UUID branchId;

    private BigDecimal grossSalary;
    private BigDecimal allowances;
    private BigDecimal deductions;
    private BigDecimal netPay;

    private boolean paid;
    private OffsetDateTime paidAt;
    private String notes;

    private String periodStatus;
}

