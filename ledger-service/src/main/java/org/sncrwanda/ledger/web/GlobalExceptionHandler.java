package org.sncrwanda.ledger.web;
import org.sncrwanda.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;
import java.time.Instant;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
  
  private String traceId() { 
    return org.slf4j.MDC.get("traceId"); 
  }
  
  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
    log.warn("Validation error on {} {}", req.getMethod(), req.getRequestURI());
    var details = ex.getBindingResult().getFieldErrors().stream()
      .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
      .collect(Collectors.toList());
    return new ErrorResponse(
      Instant.now(), 
      traceId(), 
      req.getRequestURI(),
      "VALIDATION_ERROR",
      "Invalid fields",
      details
    );
  }
  
  @ExceptionHandler(IllegalStateException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ErrorResponse handleIllegalState(IllegalStateException ex, HttpServletRequest req) {
    log.warn("Business rule violation on {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
    return new ErrorResponse(
      Instant.now(), 
      traceId(), 
      req.getRequestURI(),
      "BUSINESS_RULE_VIOLATION",
      ex.getMessage(),
      null
    );
  }
  
  @ExceptionHandler(IllegalArgumentException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleIllegalArgument(IllegalArgumentException ex, HttpServletRequest req) {
    log.warn("Invalid argument on {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
    return new ErrorResponse(
      Instant.now(), 
      traceId(), 
      req.getRequestURI(),
      "INVALID_ARGUMENT",
      ex.getMessage(),
      null
    );
  }
  
  @ExceptionHandler(jakarta.persistence.EntityNotFoundException.class)
  @ResponseStatus(HttpStatus.NOT_FOUND)
  public ErrorResponse handleEntityNotFound(jakarta.persistence.EntityNotFoundException ex, HttpServletRequest req) {
    log.warn("Entity not found on {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getMessage());
    return new ErrorResponse(
      Instant.now(), 
      traceId(), 
      req.getRequestURI(),
      "NOT_FOUND",
      ex.getMessage() != null ? ex.getMessage() : "Requested entity not found",
      null
    );
  }
  
  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleAny(Exception ex, HttpServletRequest req) {
    log.error("Unexpected error on {} {}: {}", req.getMethod(), req.getRequestURI(), ex.getMessage(), ex);
    return new ErrorResponse(
      Instant.now(), 
      traceId(), 
      req.getRequestURI(),
      "INTERNAL_ERROR",
      "Unexpected error: " + ex.getClass().getSimpleName() + " - " + ex.getMessage(),
      null
    );
  }
}
