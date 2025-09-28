package org.sncrwanda.hr.web;
import org.sncrwanda.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
@RestControllerAdvice
public class GlobalExceptionHandler {
  private String traceId() { return org.slf4j.MDC.get("traceId"); }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
    var details = ex.getBindingResult().getFieldErrors().stream()
      .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
      .collect(Collectors.toList());
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "VALIDATION_ERROR", "Invalid fields", details);
  }

  @ExceptionHandler(AccessDeniedException.class)
  @ResponseStatus(HttpStatus.FORBIDDEN)
  public ErrorResponse handleAccessDenied(AccessDeniedException ex, HttpServletRequest req) {
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "ACCESS_DENIED", ex.getMessage(), List.of());
  }

  @ExceptionHandler({IllegalArgumentException.class, DataIntegrityViolationException.class})
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleBadRequest(Exception ex, HttpServletRequest req) {
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "BAD_REQUEST", ex.getMessage(), List.of());
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<ErrorResponse> handleResponseStatus(ResponseStatusException ex, HttpServletRequest req) {
    HttpStatus status = HttpStatus.resolve(ex.getStatusCode().value());
    if (status == null) status = HttpStatus.INTERNAL_SERVER_ERROR;
    ErrorResponse body = new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), ex.getStatusCode().toString(), ex.getReason(), List.of());
    return ResponseEntity.status(status).body(body);
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleAny(Exception ex, HttpServletRequest req) {
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "INTERNAL_ERROR", "Unexpected error", null);
  }
}
