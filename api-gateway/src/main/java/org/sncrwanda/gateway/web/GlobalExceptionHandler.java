package org.sncrwanda.gateway.web;
import org.sncrwanda.common.api.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.context.request.WebRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.stream.Collectors;
@RestControllerAdvice
public class GlobalExceptionHandler {
  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
  private String traceId() { return org.slf4j.MDC.get("traceId"); }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleValidation(MethodArgumentNotValidException ex, WebRequest req) {
    var details = ex.getBindingResult().getFieldErrors().stream()
      .map(fe -> new ErrorResponse.FieldError(fe.getField(), fe.getDefaultMessage()))
      .collect(Collectors.toList());
    var path = req.getDescription(false); // typically "uri=/path"
    if (path != null && path.startsWith("uri=")) path = path.substring(4);
    return new ErrorResponse(Instant.now(), traceId(), path,"VALIDATION_ERROR","Invalid fields",details);
  }
  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleAny(Exception ex, WebRequest req) {
    // Log full stacktrace so we can diagnose 500s at the gateway
    var path = req.getDescription(false);
    if (path != null && path.startsWith("uri=")) path = path.substring(4);
    log.error("Unhandled exception for request {}", path, ex);
    return new ErrorResponse(Instant.now(), traceId(), path,"INTERNAL_ERROR","Unexpected error",null);
  }
}
