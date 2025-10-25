package org.sncrwanda.auth.dto;

import jakarta.validation.constraints.NotNull;

public class UpdateUserRoleRequest {
    @NotNull(message = "Role is required")
    private String role;

    public UpdateUserRoleRequest() {}

    public UpdateUserRoleRequest(String role) {
        this.role = role;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
