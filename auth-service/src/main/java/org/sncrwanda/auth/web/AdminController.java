package org.sncrwanda.auth.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.auth.dto.UpdateUserRequest;
import org.sncrwanda.auth.dto.UserResponse;
import org.sncrwanda.auth.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import java.util.List;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.UUID;

@RestController
@RequestMapping("/admin")
@Tag(name = "Admin", description = "Admin-only user management APIs")
public class AdminController {
    @Autowired
    private AuthService authService;

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    @GetMapping("/users")
    @Operation(summary = "List all users with roles (ADMIN or SUPER_ADMIN)")
    public ResponseEntity<List<UserResponse>> listUsers(HttpServletRequest request) {
        log.info("AdminController.listUsers received request URI={}", request.getRequestURI());
        return ResponseEntity.ok(authService.listUsers());
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update user roles/branch (ADMIN or SUPER_ADMIN)")
    @io.swagger.v3.oas.annotations.parameters.RequestBody(
        required = true,
        content = @io.swagger.v3.oas.annotations.media.Content(
            mediaType = "application/json",
            schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = UpdateUserRequest.class),
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(
                value = "{\n  \"roles\": [\"BRANCH_ADMIN\", \"TEACHER\"],\n  \"branchId\": \"00000000-0000-0000-0000-000000000001\"\n}"
            )
        )
    )
    public ResponseEntity<UserResponse> updateUser(HttpServletRequest request, @PathVariable UUID id, @Valid @RequestBody UpdateUserRequest req) {
        log.info("AdminController.updateUser received request URI={}", request.getRequestURI());
        return ResponseEntity.ok(authService.updateUser(id, req));
    }

    @GetMapping("/roles")
    @Operation(summary = "List available roles to assign")
    public ResponseEntity<List<String>> roles(HttpServletRequest request) {
        log.info("AdminController.roles received request URI={}", request.getRequestURI());
        // Central catalog of supported roles across services. Keep in sync with services' SecurityUtils expectations.
        return ResponseEntity.ok(List.of("SUPER_ADMIN","ADMIN","BRANCH_ADMIN","TEACHER","GUARDIAN","USER"));
    }
}
