package org.sncrwanda.auth.service;

import org.sncrwanda.auth.domain.User;
import org.sncrwanda.auth.dto.UserResponse;
import org.sncrwanda.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserManagementService {

    @Autowired
    private UserRepository userRepository;

    /**
     * Extract user ID from token (simple token format: auth-token-{userId}-{timestamp})
     */
    private Long extractUserIdFromToken(String token) {
        try {
            String[] parts = token.split("-");
            if (parts.length >= 3) {
                return Long.parseLong(parts[2]);
            }
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token format");
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token");
    }

    /**
     * Verify that the requester has SUPER_ADMIN role
     */
    private void verifySuperAdmin(String token) {
        Long userId = extractUserIdFromToken(token);
        User requester = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid token"));
        
        if (!User.UserRole.SUPER_ADMIN.equals(requester.getRole())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only SUPER_ADMIN can manage users");
        }
    }

    /**
     * Convert User entity to UserResponse DTO
     */
    private UserResponse toUserResponse(User user) {
        List<String> roles = Collections.singletonList(user.getRole().name());
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                roles,
                user.getActive(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    /**
     * Get all users
     */
    public List<UserResponse> getAllUsers(String token) {
        verifySuperAdmin(token);
        
        return userRepository.findAll().stream()
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get user by ID
     */
    public UserResponse getUserById(Long userId, String token) {
        verifySuperAdmin(token);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        return toUserResponse(user);
    }

    /**
     * Update user role
     */
    @Transactional
    public UserResponse updateUserRole(Long userId, String newRole, String token) {
        verifySuperAdmin(token);
        
        // Validate the role
        User.UserRole userRole;
        try {
            userRole = User.UserRole.valueOf(newRole.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "Invalid role. Valid roles are: ADMIN, SUPER_ADMIN, TEACHER, STUDENT, GUARDIAN");
        }
        
        // Get the user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        // Update the role
        user.setRole(userRole);
        User updatedUser = userRepository.save(user);
        
        return toUserResponse(updatedUser);
    }

    /**
     * Activate or deactivate a user
     */
    @Transactional
    public UserResponse toggleUserActive(Long userId, boolean active, String token) {
        verifySuperAdmin(token);
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        user.setActive(active);
        User updatedUser = userRepository.save(user);
        
        return toUserResponse(updatedUser);
    }
}
