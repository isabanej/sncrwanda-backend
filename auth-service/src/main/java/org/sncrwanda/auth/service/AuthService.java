package org.sncrwanda.auth.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.sncrwanda.auth.dto.*;
import org.sncrwanda.auth.domain.User;
import org.sncrwanda.auth.repository.UserRepository;
import org.sncrwanda.auth.exception.UnauthorizedException;
import java.util.Optional;
import java.util.List;
import java.util.Collections;

@Service
public class AuthService {
    
    @Autowired
    private UserRepository userRepository;
    
    public AuthResponse register(RegisterRequest request) {
        // Stub implementation - return a mock response
        UserResponse user = new UserResponse(1L, request.getUsername(), request.getEmail(), List.of("ADMIN"));
        return new AuthResponse("mock-token", "mock-refresh-token", 3600L, user);
    }
    
    public AuthResponse login(LoginRequest request) {
        // Make username/email lookup case-insensitive
        String usernameOrEmail = request.getUsernameOrEmail().toLowerCase();
        
        // Find user by username or email (case-insensitive)
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(usernameOrEmail)
            .or(() -> userRepository.findByEmailIgnoreCase(usernameOrEmail));
            
        if (userOpt.isEmpty()) {
            throw new UnauthorizedException("Invalid username or password");
        }
        
        User user = userOpt.get();
        
        // Check if user is active
        if (!user.getActive()) {
            throw new UnauthorizedException("Account is disabled");
        }
        
        // Simple password check (in production, use bcrypt hash comparison)
        if (!user.getPasswordHash().equals(request.getPassword())) {
            throw new UnauthorizedException("Invalid username or password");
        }
        
        // Generate a simple token (in production, use JWT with proper signing)
        String token = "auth-token-" + user.getId() + "-" + System.currentTimeMillis();
        
        // Create user response with roles
        List<String> roles = Collections.singletonList(user.getRole().name());
        UserResponse userResponse = new UserResponse(
            user.getId(), 
            user.getUsername(), 
            user.getEmail(),
            roles
        );
        
        return new AuthResponse(token, "refresh-token-" + user.getId(), 3600L, userResponse);
    }
    
    public void forgotPassword(ForgotPasswordRequest request) {
        // Stub implementation - no-op
    }
    
    public void resetPassword(ResetPasswordRequest request) {
        // Stub implementation - no-op
    }
    
    public UserResponse getCurrentUser() {
        throw new UnauthorizedException("Authentication required");
    }
    
    public UserResponse getCurrentUser(String token) {
        // Parse token format: "auth-token-{userId}-{timestamp}"
        if (token == null || !token.startsWith("auth-token-")) {
            throw new UnauthorizedException("Invalid token format");
        }
        
        try {
            // Extract user ID from token
            String[] parts = token.split("-");
            if (parts.length < 3) {
                throw new UnauthorizedException("Invalid token format");
            }
            
            Long userId = Long.parseLong(parts[2]);
            
            // Fetch user from database
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isEmpty()) {
                throw new UnauthorizedException("User not found");
            }
            
            User user = userOpt.get();
            
            // Check if user is still active
            if (!user.getActive()) {
                throw new UnauthorizedException("Account is disabled");
            }
            
            // Return user response with roles
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
        } catch (NumberFormatException e) {
            throw new UnauthorizedException("Invalid token format");
        }
    }
}