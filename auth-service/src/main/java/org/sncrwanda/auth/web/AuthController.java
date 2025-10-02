package org.sncrwanda.auth.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import org.sncrwanda.auth.dto.AuthResponse;
import org.sncrwanda.auth.dto.LoginRequest;
import org.sncrwanda.auth.dto.RegisterRequest;
import org.sncrwanda.auth.dto.UserResponse;
import org.sncrwanda.auth.dto.ForgotPasswordRequest;
import org.sncrwanda.auth.dto.ResetPasswordRequest;
import org.sncrwanda.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@Tag(name = "Authentication", description = "User registration, login, and profile APIs")
public class AuthController {
    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Register payload",
        required = true,
        content = @Content(mediaType = "application/json",
            schema = @Schema(implementation = RegisterRequest.class),
            examples = @ExampleObject(value = "{\"username\":\"alice\",\"email\":\"alice@example.com\",\"password\":\"Secret123!\"}")
        )
    )
    public ResponseEntity<AuthResponse> register(@Valid @org.springframework.web.bind.annotation.RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Login and get JWT token")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        description = "Login payload",
        required = true,
        content = @Content(mediaType = "application/json",
            schema = @Schema(implementation = LoginRequest.class),
            examples = @ExampleObject(value = "{\"usernameOrEmail\":\"alice\",\"password\":\"Secret123!\"}")
        )
    )
    public ResponseEntity<AuthResponse> login(@Valid @org.springframework.web.bind.annotation.RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Initiate password reset (no-op if user not found)")
    public ResponseEntity<Void> forgotPassword(@Valid @org.springframework.web.bind.annotation.RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Reset password using a token")
    public ResponseEntity<Void> resetPassword(@Valid @org.springframework.web.bind.annotation.RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Get current user info (requires JWT)")
    public ResponseEntity<UserResponse> me(@RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return ResponseEntity.ok(authService.getCurrentUser(token));
    }
}
