package org.sncrwanda.hr.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PayrollLineRequest {
    @NotNull
    private LineType type; // EARNING or DEDUCTION

    @NotBlank
    private String label;

    @NotNull
    @DecimalMin("0.00")
    private BigDecimal amount;

    public enum LineType { EARNING, DEDUCTION }
}

