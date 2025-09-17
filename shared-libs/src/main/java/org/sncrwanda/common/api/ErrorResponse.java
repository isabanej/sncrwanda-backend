package org.sncrwanda.common.api;

import java.time.Instant;
import java.util.List;

public record ErrorResponse(
        Instant timestamp,
        String traceId,
        String path,
        String code,
        String message,
        List<FieldError> details
) {
    public static record FieldError(String field, String message) {}
}
