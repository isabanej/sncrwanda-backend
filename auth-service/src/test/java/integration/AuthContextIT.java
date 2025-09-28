package integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.sncrwanda.auth.AuthApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@Disabled("Covered by acceptance and smoke tests; disable to avoid duplicate context load in failsafe")
@SpringBootTest(classes = AuthApplication.class)
@ActiveProfiles("test")
@ExtendWith(SpringExtension.class)
public class AuthContextIT {
    @Test
    void contextLoads() {}
}
