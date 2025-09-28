package org.sncrwanda.auth.dto;

import lombok.Data;
import java.util.Set;

@Data
public class UpdateUserRequest {
    private Set<String> roles; // e.g. ["ADMIN"], ["TEACHER"], ["BRANCH_ADMIN"]
}
