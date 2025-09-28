package org.sncrwanda.auth.service;

import org.sncrwanda.auth.domain.User;
import org.sncrwanda.auth.domain.PasswordResetToken;
import org.sncrwanda.auth.dto.AuthResponse;
import org.sncrwanda.auth.dto.LoginRequest;
import org.sncrwanda.auth.dto.RegisterRequest;
import org.sncrwanda.auth.dto.UserResponse;
import org.sncrwanda.auth.dto.ForgotPasswordRequest;
import org.sncrwanda.auth.dto.ResetPasswordRequest;
import org.sncrwanda.auth.dto.UpdateUserRequest;
import org.sncrwanda.auth.exception.UnauthorizedException;
import org.sncrwanda.auth.exception.ConflictException;
import org.sncrwanda.auth.repository.UserRepository;
import org.sncrwanda.auth.repository.PasswordResetTokenRepository;
import org.sncrwanda.auth.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.extern.slf4j.Slf4j;

import java.util.Optional;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.UUID;
import java.time.Instant;
import java.time.Duration;
import java.util.Base64;
import java.security.SecureRandom;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Locale;

@Service
@Slf4j
public class AuthService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtUtil jwtUtil;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    @Autowired
    private PasswordResetTokenRepository tokenRepository;
    @Autowired(required = false)
    private MailService mailService;

    // Simple in-memory rate limiting: email -> last request instant
    private final Map<String, Instant> forgotRateLimiter = new ConcurrentHashMap<>();
    private static final Duration FORGOT_COOLDOWN = Duration.ofMinutes(1);

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String normalizedUsername = request.getUsername() != null ? request.getUsername().toLowerCase(Locale.ROOT) : null;
        String normalizedEmail = request.getEmail() != null ? request.getEmail().toLowerCase() : null;
        if (userRepository.existsByUsernameIgnoreCase(normalizedUsername) || (normalizedEmail != null && userRepository.existsByEmailIgnoreCase(normalizedEmail))) {
            throw new ConflictException("Username or email already exists");
        }
        User user = new User();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        // bootstrap: first user becomes SUPER_ADMIN
        boolean firstUser = userRepository.count() == 0;
        // If first user OR explicitly the reserved bootstrap username 'emino', grant SUPER_ADMIN
        if (firstUser || (normalizedUsername != null && normalizedUsername.equals("emino"))) {
            user.setRoles(Set.of("SUPER_ADMIN"));
            log.info("REGISTER rolesAssigned user={} firstUser={} roles={} (EXPECT SUPER_ADMIN)", normalizedUsername, firstUser, user.getRoles());
        } else {
            user.setRoles(Set.of("USER"));
            log.info("REGISTER rolesAssigned user={} firstUser={} roles={} (EXPECT USER)", normalizedUsername, firstUser, user.getRoles());
        }
        user = userRepository.save(user);
    String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRoles());
        return new AuthResponse(token, toUserResponse(user));
    }

    public AuthResponse login(LoginRequest request) {
        String ident = request.getUsernameOrEmail();
        Optional<User> userOpt = userRepository.findByUsernameIgnoreCase(ident);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmailIgnoreCase(ident);
        }
        if (userOpt.isEmpty()) {
            throw new UnauthorizedException("Invalid credentials");
        }
        User user = userOpt.get();
        // Ensure legacy 'emino' retains SUPER_ADMIN even if DB roles were altered
        if (user.getUsername() != null && user.getUsername().equalsIgnoreCase("emino") && (user.getRoles()==null || !user.getRoles().contains("SUPER_ADMIN"))) {
            user.setRoles(Set.of("SUPER_ADMIN"));
            user = userRepository.save(user);
            log.info("LOGIN escalation applied user={} roles now={} (added SUPER_ADMIN)", user.getUsername(), user.getRoles());
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }
    String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRoles());
        log.debug("LOGIN success user={} roles={} tokenIssued", user.getUsername(), user.getRoles());
        return new AuthResponse(token, toUserResponse(user));
    }

    public UserResponse getCurrentUser(String token) {
        var userId = jwtUtil.getUserIdFromToken(token);
        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return toUserResponse(user);
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest req) {
        // Resolve user by email only. Case-insensitive.
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(req.getEmail());
        // Apply basic rate limiting per email to reduce abuse
        Instant now = Instant.now();
        Instant last = forgotRateLimiter.get(req.getEmail().toLowerCase());
        if (last != null && Duration.between(last, now).compareTo(FORGOT_COOLDOWN) < 0) {
            log.debug("Forgot-password throttled for {}", req.getEmail());
            return;
        }
        forgotRateLimiter.put(req.getEmail().toLowerCase(), now);
        if (userOpt.isEmpty()) {
            log.info("Forgot-password: email not found -> {}", req.getEmail());
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Email address not found. Please create a new account.");
        }
        User user = userOpt.get();
        // Invalidate previous tokens
        tokenRepository.deleteByUser(user);
        // Create new token
        String token = generateToken();
        PasswordResetToken prt = new PasswordResetToken();
        prt.setToken(token);
        prt.setUser(user);
        prt.setExpiresAt(Instant.now().plus(Duration.ofMinutes(15)));
        tokenRepository.save(prt);
        // Send email if mail service is configured; always log for visibility in dev
        try {
            if (mailService != null) {
                mailService.sendPasswordResetEmail(user.getEmail(), token);
            }
        } catch (Exception ex) {
            log.warn("Failed to send password reset email: {}", ex.getMessage());
        }
        log.info("PASSWORD_RESET token issued userId={} token={}", user.getId(), token);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest req) {
        PasswordResetToken prt = tokenRepository.findByToken(req.getToken())
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired reset token"));
        if (prt.isUsed() || prt.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Invalid or expired reset token");
        }
        User user = prt.getUser();
        // prevent resetting to the same current password
        if (passwordEncoder.matches(req.getNewPassword(), user.getPassword())) {
            throw new org.sncrwanda.auth.exception.SamePasswordException("New password must be different from current password");
        }
        user.setPassword(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        prt.setUsed(true);
        tokenRepository.save(prt);
    }

    private String generateToken() {
        byte[] buf = new byte[32];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    @Transactional
    public UserResponse updateUser(UUID id, UpdateUserRequest req) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        boolean rolesChanged = req.getRoles() != null && !req.getRoles().isEmpty();
        boolean emailChanged = false;
        if (rolesChanged) {
            user.setRoles(req.getRoles());
        }
        // Branch/Guardian removed
        // Optional: support email updates in future via UpdateUserRequest; normalize to lowercase
        // if (req.getEmail() != null) { user.setEmail(req.getEmail().toLowerCase()); emailChanged = true; }
        user = userRepository.save(user);
        log.info("AUDIT user.update targetId={} rolesChanged={} emailChanged={} roles={} email={}",
                id, rolesChanged, emailChanged, user.getRoles(), user.getEmail());
        return toUserResponse(user);
    }

    private UserResponse toUserResponse(User user) {
        UserResponse resp = new UserResponse();
        resp.setId(user.getId());
        resp.setUsername(user.getUsername());
        resp.setEmail(user.getEmail());
        resp.setRoles(user.getRoles());
    // Branch/Guardian removed from response
        return resp;
    }

    public List<UserResponse> listUsers() {
        return userRepository.findAll().stream().map(this::toUserResponse).collect(Collectors.toList());
    }
}
