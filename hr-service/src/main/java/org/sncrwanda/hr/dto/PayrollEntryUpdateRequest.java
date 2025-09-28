package org.sncrwanda.hr.dto;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PayrollEntryUpdateRequest {
    @DecimalMin(value = "0.00")
    private BigDecimal allowances;

    @DecimalMin(value = "0.00")
    private BigDecimal deductions;

    private String notes;
}

