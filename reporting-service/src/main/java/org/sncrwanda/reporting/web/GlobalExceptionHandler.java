package org.sncrwanda.reporting.web;
import org.sncrwanda.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
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
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"VALIDATION_ERROR","Invalid fields",details);
  }
  @ExceptionHandler(Exception.class)
  @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
  public ErrorResponse handleAny(Exception ex, HttpServletRequest req) {
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"INTERNAL_ERROR","Unexpected error",null);
  }
}
