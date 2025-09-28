package org.sncrwanda.auth.web;
import org.sncrwanda.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.sncrwanda.auth.exception.ConflictException;
import org.sncrwanda.auth.exception.UnauthorizedException;
import org.springframework.web.server.ResponseStatusException;
import org.sncrwanda.auth.exception.SamePasswordException;
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
    log.debug("Validation error on {}: {}", req.getRequestURI(), details);
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"VALIDATION_ERROR","Invalid fields",details);
  }

  @ExceptionHandler(ConflictException.class)
  @ResponseStatus(HttpStatus.CONFLICT)
  public ErrorResponse handleConflict(ConflictException ex, HttpServletRequest req) {
    log.warn("Conflict on {}: {}", req.getRequestURI(), ex.getMessage());
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"CONFLICT",ex.getMessage(),null);
  }

  @ExceptionHandler(UnauthorizedException.class)
  @ResponseStatus(HttpStatus.UNAUTHORIZED)
  public ErrorResponse handleUnauthorized(UnauthorizedException ex, HttpServletRequest req) {
    log.info("Unauthorized on {}: {}", req.getRequestURI(), ex.getMessage());
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"UNAUTHORIZED", ex.getMessage(), null);
  }

  @ExceptionHandler(SamePasswordException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleSamePassword(SamePasswordException ex, HttpServletRequest req) {
    log.info("Bad request on {}: {}", req.getRequestURI(), ex.getMessage());
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"NEW_PASSWORD_SAME_AS_CURRENT", ex.getMessage(), null);
  }

  @ExceptionHandler(ResponseStatusException.class)
  public ErrorResponse handleResponseStatus(ResponseStatusException ex, HttpServletRequest req) {
    HttpStatus status = ex.getStatusCode() instanceof HttpStatus ? (HttpStatus) ex.getStatusCode() : HttpStatus.valueOf(ex.getStatusCode().value());
    if (status.is4xxClientError()) {
      log.info("{} on {}: {}", status, req.getRequestURI(), ex.getReason());
    } else {
      log.warn("{} on {}: {}", status, req.getRequestURI(), ex.getReason());
    }
    String code = status == HttpStatus.NOT_FOUND ? "NOT_FOUND" : status.name();
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), code, ex.getReason(), null);
  }

  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleAny(Exception ex, HttpServletRequest req) {
    // Log full stacktrace so container logs show the root cause for 500 responses
    log.error("Unhandled exception for request {}", req.getRequestURI(), ex);
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"INTERNAL_ERROR","Unexpected error",null);
  }
}
