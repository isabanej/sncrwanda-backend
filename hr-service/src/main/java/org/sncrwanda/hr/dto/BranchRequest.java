package org.sncrwanda.hr.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BranchRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String address;
    // headOfBranchId optional when creating; can be set later
    private java.util.UUID headOfBranchId;
}

