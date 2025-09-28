package org.sncrwanda.student.web;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sncrwanda.common.api.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.sncrwanda.student.exception.ConflictException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
  private String traceId() { return org.slf4j.MDC.get("traceId"); }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
    var details = ex.getBindingResult().getFieldErrors().stream()
      .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
      .collect(Collectors.toList());
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "VALIDATION_ERROR", "Invalid fields", details);
  }

  @ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class })
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleBadJson(Exception ex, HttpServletRequest req) {
    String msg = ex.getMessage();
    // Make enum errors clearer for clients
    if (msg != null && msg.contains("Cannot deserialize value of type") && msg.contains("Need")) {
      msg = "Invalid need value. Allowed: PHYSICAL, HEARING, SOCIAL_COMMUNICATION_AUTISM, MENTAL_EMOTIONAL_HEALTH, HEALTH_CONDITION, MOBILITY, VISUAL, SPEECH_LANGUAGE, LEARNING, OTHER";
    }
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "BAD_REQUEST", msg != null ? msg : "Invalid request body", null);
  }

  @ExceptionHandler(RuntimeException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleRuntime(RuntimeException ex, HttpServletRequest req) {
    // Surface meaningful messages thrown by service layer (e.g., branch or guardian validation)
    String msg = ex.getMessage();
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "BAD_REQUEST", msg != null ? msg : "Bad request", null);
  }

  @ExceptionHandler(ConflictException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ErrorResponse handleConflict(ConflictException ex, HttpServletRequest req) {
    java.util.List<org.sncrwanda.common.api.ErrorResponse.FieldError> details = null;
    try {
      Object d = ex.getDetails();
      if (d != null) {
        String msg = d.toString();
        details = java.util.List.of(new org.sncrwanda.common.api.ErrorResponse.FieldError("hint", msg));
      }
    } catch (Exception ignore) {}
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "CONFLICT", ex.getMessage(), details);
  }

  @ExceptionHandler(NullPointerException.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleNpe(NullPointerException ex, HttpServletRequest req) {
    // Do not leak low-level NPE messages like "Cannot read the array length..." to clients
    log.error("Null pointer processing {} {}", req.getMethod(), req.getRequestURI(), ex);
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "INTERNAL_ERROR", "Unexpected error", null);
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleAny(Exception ex, HttpServletRequest req) {
    // Log full stack to help diagnose unexpected failures during development
      log.error("Unhandled exception processing {} {}", req.getMethod(), req.getRequestURI(), ex);
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "INTERNAL_ERROR", "Unexpected error", null);
  }
}
