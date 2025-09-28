package integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.sncrwanda.gateway.ApiGatewayApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.BootstrapWith;
import org.springframework.boot.test.context.SpringBootTestContextBootstrapper;

@Disabled("Covered by acceptance and smoke tests; disable to avoid duplicate context load in failsafe")
@BootstrapWith(SpringBootTestContextBootstrapper.class)
@SpringBootTest(classes = ApiGatewayApplication.class)
@ActiveProfiles("test")
public class ApiGatewayContextIT {
    @Test
    void contextLoads() {}
}
