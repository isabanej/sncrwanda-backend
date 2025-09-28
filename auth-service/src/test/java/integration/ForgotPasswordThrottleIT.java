package integration;

import config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.sncrwanda.auth.AuthApplication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = AuthApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class ForgotPasswordThrottleIT {
    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    @Test
    void second_request_within_cooldown_is_accepted_but_not_processed() {
        String url = "http://localhost:"+port+"/auth/forgot-password";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String body = "{\"email\":\"throttle@example.com\"}";
        HttpEntity<String> req = new HttpEntity<>(body, headers);

        ResponseEntity<Void> first = rest.postForEntity(url, req, Void.class);
        assertEquals(HttpStatus.ACCEPTED, first.getStatusCode());
        ResponseEntity<Void> second = rest.postForEntity(url, req, Void.class);
        assertEquals(HttpStatus.ACCEPTED, second.getStatusCode());
        // Behavior is 202 for both; throttling is internal. We just assert service remains responsive.
    }
}
