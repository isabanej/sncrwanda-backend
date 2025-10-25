package org.sncrwanda.auth.web;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.sncrwanda.auth.dto.UpdateUserRoleRequest;
import org.sncrwanda.auth.dto.UserResponse;
import org.sncrwanda.auth.service.UserManagementService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/auth/admin")
@Tag(name = "User Management", description = "User management APIs for administrators")
@SecurityRequirement(name = "Bearer Authentication")
public class UserManagementController {
    
    @Autowired
    private UserManagementService userManagementService;

    @GetMapping("/users")
    @Operation(summary = "Get all users (SUPER_ADMIN only)")
    public ResponseEntity<List<UserResponse>> getAllUsers(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        List<UserResponse> users = userManagementService.getAllUsers(token);
        return ResponseEntity.ok(users);
    }

    @GetMapping("/users/{userId}")
    @Operation(summary = "Get user by ID (SUPER_ADMIN only)")
    public ResponseEntity<UserResponse> getUserById(
            @PathVariable Long userId,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        UserResponse user = userManagementService.getUserById(userId, token);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}")
    @Operation(summary = "Update user (including roles) (SUPER_ADMIN only)")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long userId,
            @Valid @RequestBody UserResponse request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        
        // Extract the first role from the roles array
        String newRole = null;
        if (request.getRoles() != null && !request.getRoles().isEmpty()) {
            newRole = request.getRoles().get(0);
        }
        
        if (newRole != null) {
            UserResponse updatedUser = userManagementService.updateUserRole(userId, newRole, token);
            return ResponseEntity.ok(updatedUser);
        }
        
        // If no role update, just return the user as-is
        UserResponse user = userManagementService.getUserById(userId, token);
        return ResponseEntity.ok(user);
    }

    @PutMapping("/users/{userId}/role")
    @Operation(summary = "Update user role (SUPER_ADMIN only)")
    public ResponseEntity<UserResponse> updateUserRole(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateUserRoleRequest request,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        UserResponse updatedUser = userManagementService.updateUserRole(userId, request.getRole(), token);
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/users/{userId}/activate")
    @Operation(summary = "Activate/deactivate user (SUPER_ADMIN only)")
    public ResponseEntity<UserResponse> toggleUserActive(
            @PathVariable Long userId,
            @RequestParam boolean active,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        UserResponse updatedUser = userManagementService.toggleUserActive(userId, active, token);
        return ResponseEntity.ok(updatedUser);
    }
    
    @GetMapping("/roles")
    @Operation(summary = "Get all available roles")
    public ResponseEntity<List<String>> getAllRoles() {
        List<String> roles = List.of("ADMIN", "SUPER_ADMIN", "TEACHER", "STUDENT", "GUARDIAN");
        return ResponseEntity.ok(roles);
    }
}
