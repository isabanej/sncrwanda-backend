package smoke;

import config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.sncrwanda.auth.AuthApplication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = AuthApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class HealthEndpointSmokeTest {
    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    @Test
    void health_is_up() {
        ResponseEntity<String> res = rest.getForEntity("http://localhost:"+port+"/actuator/health", String.class);
        assertEquals(200, res.getStatusCode().value());
        String body = res.getBody();
        assertNotNull(body);
        assertTrue(body.contains("UP"));
    }
}
