package org.sncrwanda.auth.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgotPasswordRequest {
    /** Email only; keep alias for backward compatibility if the client still sends usernameOrEmail. */
    @NotBlank
    @Email
    @JsonAlias({"usernameOrEmail"})
    private String email;
}
