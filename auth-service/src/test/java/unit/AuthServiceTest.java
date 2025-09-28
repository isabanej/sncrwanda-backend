package unit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sncrwanda.auth.domain.User;
import org.sncrwanda.auth.dto.AuthResponse;
import org.sncrwanda.auth.dto.LoginRequest;
import org.sncrwanda.auth.dto.RegisterRequest;
import org.sncrwanda.auth.repository.UserRepository;
import org.sncrwanda.auth.security.JwtUtil;
import org.sncrwanda.auth.service.AuthService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository userRepository;
    @Mock JwtUtil jwtUtil;
    @InjectMocks AuthService service;

    @Test
    void register_firstUserGetsSuperAdmin_andTokenIssued() {
        RegisterRequest req = new RegisterRequest();
        req.setUsername("alice");
        req.setEmail("alice@example.com");
        req.setPassword("secret");
    when(userRepository.existsByUsernameIgnoreCase("alice")).thenReturn(false);
    when(userRepository.existsByEmailIgnoreCase("alice@example.com")).thenReturn(false);
        when(userRepository.count()).thenReturn(0L);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });
    when(jwtUtil.generateToken(any(UUID.class), anyString(), anySet())).thenReturn("jwt-token");

        AuthResponse resp = service.register(req);
        assertEquals("jwt-token", resp.getToken());
        assertTrue(resp.getUser().getRoles().contains("SUPER_ADMIN"));
    }

    @Test
    void login_successWithEncodedPassword() {
        BCryptPasswordEncoder enc = new BCryptPasswordEncoder();
        User u = User.builder()
                .id(UUID.randomUUID())
                .username("bob")
                .email("bob@example.com")
                .password(enc.encode("p4ss"))
                .roles(Set.of("USER"))
                .build();
    when(userRepository.findByUsernameIgnoreCase("bob")).thenReturn(Optional.of(u));
    when(jwtUtil.generateToken(any(UUID.class), anyString(), anySet())).thenReturn("jwt");
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("bob");
        req.setPassword("p4ss");

        AuthResponse resp = service.login(req);
        assertEquals("jwt", resp.getToken());
        assertEquals("bob", resp.getUser().getUsername());
    }
}

