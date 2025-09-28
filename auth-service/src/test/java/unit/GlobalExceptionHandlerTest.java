package unit;

import org.junit.jupiter.api.Test;
import org.sncrwanda.auth.exception.SamePasswordException;
import org.sncrwanda.auth.web.GlobalExceptionHandler;
import org.sncrwanda.common.api.ErrorResponse;

import jakarta.servlet.http.HttpServletRequest;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GlobalExceptionHandlerTest {
    @Test
    void samePassword_maps_to_specific_code_and_400() {
        GlobalExceptionHandler geh = new GlobalExceptionHandler();
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getRequestURI()).thenReturn("/auth/reset-password");

        ErrorResponse er = geh.handleSamePassword(new SamePasswordException("New password must be different from current password"), req);
        assertEquals("NEW_PASSWORD_SAME_AS_CURRENT", er.code());
        assertEquals("/auth/reset-password", er.path());
        assertTrue(er.message().contains("different"));
    }
}
