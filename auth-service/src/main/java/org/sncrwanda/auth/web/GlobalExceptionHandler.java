package org.sncrwanda.auth.web;
import org.sncrwanda.common.api.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.beans.factory.annotation.Autowired;
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
  @Autowired
  private org.sncrwanda.auth.service.AuthService authService;
  
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

  @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
  @ResponseStatus(HttpStatus.BAD_REQUEST)
  public ErrorResponse handleBadJson(org.springframework.http.converter.HttpMessageNotReadableException ex, HttpServletRequest req) {
    log.info("Malformed JSON on {}: {}", req.getRequestURI(), ex.getMessage());
    // Try a simple tolerant fallback: attempt to extract username/password from the raw request body
    try {
      String raw = new String(req.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8).trim();
      if (raw != null && !raw.isEmpty()) {
        // patterns we might see: { usernameOrEmail:emino,password:123456 } or usernameOrEmail=emino&password=123456
        java.util.Map<String,String> kv = new java.util.HashMap<>();
        // try form-style parsing
        if (raw.contains("=") && raw.contains("&")) {
          for (String pair : raw.split("&")) {
            String[] parts = pair.split("=",2);
            if (parts.length==2) kv.put(parts[0].trim(), java.net.URLDecoder.decode(parts[1].trim(), java.nio.charset.StandardCharsets.UTF_8));
          }
        } else {
          // try crude object-literal parsing: extract words after ':' or ':' with quotes
          java.util.regex.Pattern p = java.util.regex.Pattern.compile("(?i)(usernameOrEmail|username|email)\\s*[:=]\\s*\\\"?([^\\\\\",}]+)\\\"?");
          java.util.regex.Matcher m = p.matcher(raw);
          while (m.find()) {
            kv.put(m.group(1).toLowerCase(), m.group(2));
          }
          // password
          java.util.regex.Pattern p2 = java.util.regex.Pattern.compile("(?i)password\\s*[:=]\\s*\\\"?([^\\\\\",}]+)\\\"?");
          java.util.regex.Matcher m2 = p2.matcher(raw);
          if (m2.find()) kv.put("password", m2.group(1));
        }
        String ident = kv.getOrDefault("usernameOrEmail", kv.getOrDefault("username", kv.get("email")));
        String password = kv.get("password");
        if (ident != null && password != null) {
          // attempt login; if it fails it will throw UnauthorizedException which we allow to be mapped normally
          try {
            org.sncrwanda.auth.dto.LoginRequest lr = new org.sncrwanda.auth.dto.LoginRequest();
            lr.setUsernameOrEmail(ident);
            lr.setPassword(password);
            var resp = authService.login(lr);
            // If login succeeded, return a 200-like ErrorResponse is odd — instead return UNAUTHORIZED false path earlier never here.
            // But to be safe, return a BAD_REQUEST with a helpful message indicating malformed JSON was provided.
            return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "MALFORMED_JSON_BUT_LOGIN_OK", "Malformed JSON received but credentials validated. Please send proper application/json payload.", null);
          } catch (UnauthorizedException u) {
            // fallback to unauthorized
            return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(), "UNAUTHORIZED", "Invalid credentials", null);
          } catch (Exception ignore) {
            // fall through to generic message below
          }
        }
      }
    } catch (Exception e) {
      log.debug("Fallback parsing failed: {}", e.toString());
    }
    return new ErrorResponse(Instant.now(), traceId(), req.getRequestURI(),"MALFORMED_JSON","Malformed request body. Expecting application/json with quoted property names", null);
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
