package org.sncrwanda.auth.dto;

import lombok.Data;

import java.util.Set;
import java.util.UUID;

@Data
public class UserResponse {
    private UUID id;
    private String username;
    private String email;
    private Set<String> roles;
    // Removed branchId and guardianId from API response
}
