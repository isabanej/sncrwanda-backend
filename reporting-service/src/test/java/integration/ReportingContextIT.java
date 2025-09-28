package integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.sncrwanda.reporting.ReportingApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@Disabled("Covered by smoke tests; disable to avoid duplicate context load in failsafe")
@SpringBootTest(classes = ReportingApplication.class)
@ActiveProfiles("test")
@ExtendWith(SpringExtension.class)
public class ReportingContextIT {
    @Test
    void contextLoads() {}
}
