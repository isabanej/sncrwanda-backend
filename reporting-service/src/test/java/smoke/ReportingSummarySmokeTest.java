package smoke;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

@SpringBootTest(classes = org.sncrwanda.reporting.ReportingApplication.class)
@Import(config.TestSecurityConfig.class)
@AutoConfigureMockMvc
class ReportingSummarySmokeTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void summaryEndpointsReturnOk() throws Exception {
        mvc.perform(get("/reports/summary").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employeeCount").exists())
                .andExpect(jsonPath("$.studentCount").exists());

        mvc.perform(get("/reports/students/summary").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStudents").exists())
                .andExpect(jsonPath("$.activeStudents").exists())
                .andExpect(jsonPath("$.deletedStudents").exists());
    }
}
