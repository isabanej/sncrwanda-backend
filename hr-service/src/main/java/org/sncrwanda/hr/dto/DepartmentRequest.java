package org.sncrwanda.hr.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.UUID;

@Data
public class DepartmentRequest {
    @NotBlank
    private String name;
    @NotNull
    private UUID branchId;
}
