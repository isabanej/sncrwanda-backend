package org.sncrwanda.gateway.web;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.io.IOException;
import java.util.Objects;

@RestController
public class ProxyController {
  private static final Logger log = LoggerFactory.getLogger(ProxyController.class);
  private final RestClient http = RestClient.create();
  private static final String[] HOP_BY_HOP = new String[]{
      HttpHeaders.TRANSFER_ENCODING,
      HttpHeaders.CONNECTION,
      "Keep-Alive",
      "Proxy-Connection",
      "Trailer",
      "Upgrade",
      "TE"
  };

  @Value("${services.auth:http://localhost:9092}")
  private String authBase;
  @Value("${services.ledger:http://localhost:9091}")
  private String ledgerBase;
  @Value("${services.hr:http://localhost:9094}")
  private String hrBase;
  @Value("${services.student:http://localhost:9095}")
  private String studentBase;
  @Value("${services.reporting:http://localhost:9096}")
  private String reportingBase;

  @RequestMapping(path = {"/auth/**","/hr/**","/students","/students/**","/_student/**","/reports/**","/transactions/**","/employee-evaluations/**","/student-reports/**"})
  public ResponseEntity<byte[]> proxy(HttpServletRequest req, @RequestBody(required = false) byte[] body) throws IOException {
    HttpMethod method = HttpMethod.valueOf(req.getMethod());
  String path = req.getRequestURI();
  String query = req.getQueryString();
  String target;
  if (path.startsWith("/auth/")) target = authBase + path; // auth controllers include /auth prefix
  else if (path.startsWith("/transactions/")) target = ledgerBase + path; // ledger exposes /transactions at root
  else if (path.equals("/transactions")) target = ledgerBase + "/transactions"; // collection
  else if (path.startsWith("/hr/")) target = hrBase + path.substring("/hr".length()); // hr controllers are mounted at root (e.g., /employees)
  else if (path.equals("/students")) target = studentBase + "/students"; // student collection root
  else if (path.startsWith("/students/")) target = studentBase + path; // student controllers are mounted at /students
  else if (path.startsWith("/_student/students")) target = studentBase + path.substring("/_student".length()); // fallback alias used by frontend for resilience
  else if (path.startsWith("/student-reports/")) target = studentBase + path; // student reports live in student-service
  else if (path.startsWith("/reports/")) target = reportingBase + path; // reporting mounted at /reports already
    else target = null;
  if (target == null) return ResponseEntity.notFound().build();
  if (query != null && !query.isEmpty()) target = target + "?" + query;

    HttpHeaders headers = new HttpHeaders();
    // Forward auth header and content-type
    String auth = req.getHeader(HttpHeaders.AUTHORIZATION);
    if (auth != null) headers.add(HttpHeaders.AUTHORIZATION, auth);
    String ct = req.getHeader(HttpHeaders.CONTENT_TYPE);
    if (ct != null) headers.add(HttpHeaders.CONTENT_TYPE, ct);
    // Accept JSON by default
    headers.add(HttpHeaders.ACCEPT, req.getHeader(HttpHeaders.ACCEPT) != null ? req.getHeader(HttpHeaders.ACCEPT) : "application/json");

    try {
      var requestSpec = http.method(method).uri(target).headers(h -> {
        if (auth != null) h.add(HttpHeaders.AUTHORIZATION, auth);
        if (ct != null) h.add(HttpHeaders.CONTENT_TYPE, ct);
        String accept = req.getHeader(HttpHeaders.ACCEPT);
        h.add(HttpHeaders.ACCEPT, accept != null ? accept : "application/json");
      });
      ResponseEntity<byte[]> resp;
      boolean hasBody = body != null && (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH);
      if (hasBody) {
        // body is guaranteed non-null when hasBody is true
        resp = requestSpec.body(Objects.requireNonNull(body)).retrieve().toEntity(byte[].class);
      } else {
        resp = requestSpec.retrieve().toEntity(byte[].class);
      }
      HttpHeaders out = filteredHeaders(resp.getHeaders());
      return ResponseEntity.status(resp.getStatusCode()).headers(out).body(resp.getBody());
    } catch (RestClientResponseException ex) {
      HttpHeaders eh = ex.getResponseHeaders() != null ? filteredHeaders(ex.getResponseHeaders()) : new HttpHeaders();
      byte[] rb = ex.getResponseBodyAsByteArray();
      return ResponseEntity.status(ex.getStatusCode()).headers(eh).body(rb);
    } catch (Exception ex) {
      // Log unexpected upstream failures for diagnostics (previously silent leading to opaque 502s)
      log.error("Proxy failure {} {} -> {} : {}", method, path, target, ex.toString(), ex);
      HttpHeaders eh = new HttpHeaders();
      eh.add(HttpHeaders.CONTENT_TYPE, "application/json");
      String msg = String.format("{\"code\":\"BAD_GATEWAY\",\"message\":\"Upstream call failed: %s\"}", ex.getClass().getSimpleName());
      return ResponseEntity.status(502).headers(eh).body(msg.getBytes());
    }
  }

  private HttpHeaders filteredHeaders(HttpHeaders in) {
    HttpHeaders out = new HttpHeaders();
    in.forEach((k, v) -> {
      if (!isHopByHop(k)) {
        out.put(k, v);
      }
    });
    // Let Spring compute Content-Length; remove if present
    out.remove(HttpHeaders.CONTENT_LENGTH);
    out.remove(HttpHeaders.TRANSFER_ENCODING);
    return out;
  }

  private boolean isHopByHop(String name) {
    for (String h : HOP_BY_HOP) {
      if (h.equalsIgnoreCase(name)) return true;
    }
    return false;
  }
}
