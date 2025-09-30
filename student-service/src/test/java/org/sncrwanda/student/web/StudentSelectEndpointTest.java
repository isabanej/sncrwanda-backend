package org.sncrwanda.student.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
class StudentSelectEndpointTest {

    @Autowired
    MockMvc mvc;

    @Test
    void selectEndpointAccessibleAndNotTreatedAsId() throws Exception {
        // Expect 401 (unauthorized) or 200 depending on security config, but NOT 400 with UUID conversion error.
        // We'll accept 200, 401, or 403 as valid outcomes meaning the route resolved to the correct handler.
        try {
            mvc.perform(get("/students/select"))
                .andExpect(result -> {
                    int sc = result.getResponse().getStatus();
                    if (sc != 200 && sc != 401 && sc != 403) {
                        throw new AssertionError("Unexpected status for /students/select: " + sc + " body=" + result.getResponse().getContentAsString());
                    }
                    String body = result.getResponse().getContentAsString();
                    if (body != null && body.contains("Invalid UUID string")) {
                        throw new AssertionError("/students/select should not be parsed as a UUID path variable");
                    }
                });
        } catch (AssertionError e) {
            throw e;
        }
    }
}
