package integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.sncrwanda.student.StudentApplication;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.test.context.junit.jupiter.SpringExtension;

@Disabled("Covered by smoke tests; disable to avoid duplicate context load in failsafe")
@SpringBootTest(classes = StudentApplication.class)
@ActiveProfiles("test")
@ExtendWith(SpringExtension.class)
public class StudentContextIT {
    @Test
    void contextLoads() {}
}
