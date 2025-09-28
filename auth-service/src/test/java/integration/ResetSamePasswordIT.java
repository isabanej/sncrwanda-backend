package integration;

import config.TestSecurityConfig;
import org.sncrwanda.auth.repository.PasswordResetTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.sncrwanda.auth.AuthApplication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;


import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = AuthApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class ResetSamePasswordIT {
    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;
    @Autowired PasswordResetTokenRepository tokenRepo;

    private String baseUrl() { return "http://localhost:"+port; }

    @BeforeEach
    void setupUser() {
        // Register a user
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"username\":\"eve\",\"email\":\"eve@example.com\",\"password\":\"Secret123!\"}";
        rest.postForEntity(baseUrl()+"/auth/register", new HttpEntity<>(body, h), String.class);
        // Request a reset token
        rest.postForEntity(baseUrl()+"/auth/forgot-password", new HttpEntity<>("{\"email\":\"eve@example.com\"}", h), Void.class);
    }

    @Test
    void reset_with_same_password_returns_specific_error() {
        var token = tokenRepo.findAll().stream().findFirst().orElseThrow().getToken();
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"token\":\""+token+"\",\"newPassword\":\"Secret123!\"}"; // same as original
        ResponseEntity<String> res = rest.postForEntity(baseUrl()+"/auth/reset-password", new HttpEntity<>(body, h), String.class);
        assertEquals(400, res.getStatusCode().value());
    String respBody = res.getBody();
    assertNotNull(respBody);
    assertTrue(respBody.contains("NEW_PASSWORD_SAME_AS_CURRENT"));
    }
}
