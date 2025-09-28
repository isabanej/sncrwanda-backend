package org.sncrwanda.hr.dto;

import java.util.UUID;
import lombok.Data;

@Data
public class BranchResponse {
    private UUID id;
    private String name;
    private String address;
    private UUID headOfBranchId;
}

