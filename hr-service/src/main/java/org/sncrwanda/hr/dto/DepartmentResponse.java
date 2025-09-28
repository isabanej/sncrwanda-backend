package org.sncrwanda.hr.dto;

import java.util.UUID;
import lombok.Data;

@Data
public class DepartmentResponse {
    private UUID id;
    private String name;
    private UUID branchId;
}
