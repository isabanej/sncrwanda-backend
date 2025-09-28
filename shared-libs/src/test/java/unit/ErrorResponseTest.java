package unit;

import org.junit.jupiter.api.Test;
import org.sncrwanda.common.api.ErrorResponse;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ErrorResponseTest {
    @Test
    void constructs_and_reads_fields() {
        Instant now = Instant.now();
        ErrorResponse.FieldError fe = new ErrorResponse.FieldError("field","bad");
        ErrorResponse er = new ErrorResponse(now, "trace", "/path", "CODE", "Message", List.of(fe));
        assertEquals(now, er.timestamp());
        assertEquals("trace", er.traceId());
        assertEquals("/path", er.path());
        assertEquals("CODE", er.code());
        assertEquals("Message", er.message());
        assertEquals(1, er.details().size());
        assertEquals("field", er.details().get(0).field());
    }
}

