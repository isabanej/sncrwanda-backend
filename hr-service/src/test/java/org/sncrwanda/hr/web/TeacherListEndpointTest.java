package org.sncrwanda.hr.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
class TeacherListEndpointTest {

    @Autowired
    MockMvc mvc;

    @Test
    void teachersEndpointAccessibleAndReturnsListOrAuthStatus() throws Exception {
        // Accept 200 (OK), 401 (Unauthorized), or 403 (Forbidden) as valid route resolutions.
        mvc.perform(get("/employees/teachers"))
            .andExpect(result -> {
                int sc = result.getResponse().getStatus();
                if (sc != 200 && sc != 401 && sc != 403) {
                    throw new AssertionError("Unexpected status for /employees/teachers: " + sc + " body=" + result.getResponse().getContentAsString());
                }
                String body = result.getResponse().getContentAsString();
                if (body != null && body.contains("Invalid UUID")) {
                    throw new AssertionError("/employees/teachers should not be interpreted as a path variable");
                }
            });
    }
}
