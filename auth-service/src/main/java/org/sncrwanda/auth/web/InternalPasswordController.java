package org.sncrwanda.auth.web;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sncrwanda.auth.domain.User;
import org.sncrwanda.auth.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Locale;
import java.util.Set;

@RestController
@RequiredArgsConstructor
public class InternalPasswordController {

    private static final Logger log = LoggerFactory.getLogger("INTERNAL-PASSWORD");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // TEMPORARY internal endpoint to forcibly set password for emino during debugging.
    // Should be removed once password is updated successfully.
    @PostMapping("/auth/_internal/set-password")
    public ResponseEntity<?> setPassword(@RequestParam String username, @RequestParam String rawPassword) {
        if (!"emino".equalsIgnoreCase(username)) {
            return ResponseEntity.badRequest().body("Only emino supported in this temporary endpoint");
        }
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null) {
            // auto-create with SUPER_ADMIN role if missing
            user = User.builder()
                    .username(username)
                    .email(username + "@example.com")
                    .roles(Set.of("SUPER_ADMIN"))
                    .password(passwordEncoder.encode(rawPassword))
                    .build();
            userRepository.save(user);
            log.warn("Internal password set & user CREATED for '{}'.", username.toLowerCase(Locale.ROOT));
            return ResponseEntity.ok("User created and password set");
        }
        user.setPassword(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
        log.warn("Internal password force-set for user '{}'. This endpoint must be removed after use.", username.toLowerCase(Locale.ROOT));
        return ResponseEntity.ok("Password updated");
    }

    @PostMapping("/auth/_internal/login-simple")
    public ResponseEntity<?> simpleLogin(@RequestParam String username, @RequestParam String password) {
        User user = userRepository.findByUsernameIgnoreCase(username).orElse(null);
        if (user == null) return ResponseEntity.status(404).body("user not found");
        boolean matches = passwordEncoder.matches(password, user.getPassword());
        return ResponseEntity.ok("MATCH=" + matches + ";ROLES=" + user.getRoles());
    }
}
