package acceptance;

import config.TestSecurityConfig;
import org.junit.jupiter.api.Test;
import org.sncrwanda.reporting.ReportingApplication;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = ReportingApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(TestSecurityConfig.class)
class OpenApiAcceptanceTest {
    @LocalServerPort int port;
    @Autowired TestRestTemplate rest;

    @Test
    void openapi_is_available() {
        ResponseEntity<String> res = rest.getForEntity("http://localhost:"+port+"/v3/api-docs", String.class);
        assertEquals(200, res.getStatusCode().value());
        assertTrue(res.getBody() != null && res.getBody().contains("openapi"));
    }
}

