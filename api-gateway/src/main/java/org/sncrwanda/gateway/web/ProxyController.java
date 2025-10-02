package org.sncrwanda.gateway.web;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.ClientHttpRequestInterceptor;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Objects;

@RestController
public class ProxyController {
    private static final Logger log = LoggerFactory.getLogger(ProxyController.class);
    private final RestTemplate rest = createRestTemplate();
    @Value("${gateway.logging.body.enabled:false}")
    private boolean gatewayBodyLoggingEnabled;

    private RestTemplate createRestTemplate() {
        RestTemplate rt = new RestTemplate();
        ClientHttpRequestInterceptor interceptor = (request, body, execution) -> {
            try {
                if (gatewayBodyLoggingEnabled) {
                    String uri = request.getURI() != null ? request.getURI().toString() : "<no-uri>";
                    String method = request.getMethod() != null ? request.getMethod().name() : "UNKNOWN";
                    String ct = request.getHeaders() != null ? request.getHeaders().getFirst(HttpHeaders.CONTENT_TYPE) : null;
                    String raw = body != null ? new String(body, StandardCharsets.UTF_8) : "<null>";
                    String snippet = raw.length() > 1000 ? raw.substring(0, 1000) + "..." : raw;
                    log.info("[OUTGOING] {} {} Content-Type:{} body(utf8,trim): {}", method, uri, ct, snippet);
                }
            } catch (Exception e) {
                log.warn("Failed to log outgoing request: {}", e.toString());
            }
            return execution.execute(request, body);
        };
        rt.getInterceptors().add(interceptor);
        return rt;
    }
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

    @RequestMapping(path = {"/auth/**", "/admin/**", "/hr/**", "/students", "/students/**", "/_student/**", "/reports/**", "/transactions/**", "/employee-evaluations/**", "/student-reports/**"})
    public ResponseEntity<byte[]> proxy(HttpServletRequest req, @RequestBody(required = false) byte[] body) throws IOException {
        HttpMethod method = HttpMethod.valueOf(req.getMethod());
        String path = req.getRequestURI();
        String query = req.getQueryString();
        String target = null;
        log.info("Proxy invoked for {} {}", method, path);

        if (path.startsWith("/auth/")) {
            // Forward the full /auth/... path to the auth service so controller-level
            // @RequestMapping("/auth") mappings are preserved (e.g. /auth/login -> /auth/login)
            target = authBase + path;
        } else if (path.startsWith("/admin/")) {
            target = authBase + path;
        } else if (path.startsWith("/transactions/")) target = ledgerBase + path;
        else if (path.equals("/transactions")) target = ledgerBase + "/transactions";
        else if (path.startsWith("/hr/")) target = hrBase + path.substring("/hr".length());
        else if (path.equals("/students")) target = studentBase + "/students";
        else if (path.startsWith("/students/")) target = studentBase + path;
        else if (path.startsWith("/_student/students")) target = studentBase + path.substring("/_student".length());
        else if (path.startsWith("/student-reports/")) target = studentBase + path;
        else if (path.startsWith("/reports/")) target = reportingBase + path;

        if (target == null) return ResponseEntity.notFound().build();
        if (query != null && !query.isEmpty()) target = target + "?" + query;
        log.info("Proxy target resolved: {} -> {}", path, target);

        // Diagnostic logging for /auth/login
        try {
            if (path.endsWith("/login") && "POST".equalsIgnoreCase(req.getMethod())) {
                String ctDebug = req.getHeader(HttpHeaders.CONTENT_TYPE);
                log.info("[DEBUG] Incoming {} Content-Type: {}", path, ctDebug);
                if (body != null) {
                    String raw = new String(body, StandardCharsets.UTF_8);
                    String snippet = raw.length() > 1000 ? raw.substring(0, 1000) + "..." : raw;
                    log.info("[DEBUG] Incoming {} body (utf8, trimmed): {}", path, snippet);
                } else {
                    log.info("[DEBUG] Incoming {} body: <null>", path);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to debug-log {} body: {}", path, e.toString());
        }

        try {
            HttpHeaders forwardHeaders = new HttpHeaders();
            String auth = req.getHeader(HttpHeaders.AUTHORIZATION);
            if (auth != null) forwardHeaders.add(HttpHeaders.AUTHORIZATION, auth);
            String ct = req.getHeader(HttpHeaders.CONTENT_TYPE);
            if (ct != null) forwardHeaders.add(HttpHeaders.CONTENT_TYPE, ct);
            String accept = req.getHeader(HttpHeaders.ACCEPT);
            forwardHeaders.add(HttpHeaders.ACCEPT, accept != null ? accept : "application/json");

            boolean hasBody = body != null && (method == HttpMethod.POST || method == HttpMethod.PUT || method == HttpMethod.PATCH);
            ResponseEntity<byte[]> resp = null;
            // Normalize the body by stripping UTF-8 BOM (0xEF,0xBB,0xBF) if present to avoid upstream JSON parse issues
            byte[] forwardBody = null;
            if (hasBody) {
                forwardBody = body;
                if (forwardBody.length >= 3 && (forwardBody[0] & 0xFF) == 0xEF && (forwardBody[1] & 0xFF) == 0xBB && (forwardBody[2] & 0xFF) == 0xBF) {
                    // strip BOM
                    int newLen = forwardBody.length - 3;
                    byte[] tmp = new byte[newLen];
                    System.arraycopy(forwardBody, 3, tmp, 0, newLen);
                    forwardBody = tmp;
                    log.info("Stripped UTF-8 BOM from incoming request body for {}", path);
                }
            }

            if (hasBody) forwardHeaders.setContentLength(Objects.requireNonNull(body).length);

            int maxRetries = 3;
            long backoffMs = 150;
            Exception lastEx = null;
            if (hasBody) {
                byte[] requestBody = Objects.requireNonNull(forwardBody);
                forwardHeaders.setContentLength(requestBody.length);
                RequestEntity<byte[]> requestEntity = RequestEntity.method(method, URI.create(target)).headers(forwardHeaders).body(requestBody);
                for (int attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        resp = rest.exchange(requestEntity, byte[].class);
                        lastEx = null;
                        break;
                    } catch (ResourceAccessException rae) {
                        lastEx = rae;
                        log.warn("Transient error calling {} (attempt {} of {}): {}", target, attempt, maxRetries, rae.toString());
                        if (attempt == maxRetries) throw rae;
                        try { Thread.sleep(backoffMs * attempt); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
                    }
                }
            } else {
                RequestEntity<Void> requestEntity = RequestEntity.method(method, URI.create(target)).headers(forwardHeaders).build();
                for (int attempt = 1; attempt <= maxRetries; attempt++) {
                    try {
                        resp = rest.exchange(requestEntity, byte[].class);
                        lastEx = null;
                        break;
                    } catch (ResourceAccessException rae) {
                        lastEx = rae;
                        log.warn("Transient error calling {} (attempt {} of {}): {}", target, attempt, maxRetries, rae.toString());
                        if (attempt == maxRetries) throw rae;
                        try { Thread.sleep(backoffMs * attempt); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
                    }
                }
            }

            if (resp == null) {
                throw new IllegalStateException("Upstream did not return a response");
            }
            HttpHeaders out = filteredHeaders(resp.getHeaders());
            return ResponseEntity.status(resp.getStatusCode()).headers(out).body(resp.getBody());
        } catch (RestClientResponseException ex) {
            HttpHeaders eh = ex.getResponseHeaders() != null ? filteredHeaders(ex.getResponseHeaders()) : new HttpHeaders();
            byte[] rb = ex.getResponseBodyAsByteArray();
            return ResponseEntity.status(ex.getStatusCode()).headers(eh).body(rb);
        } catch (Exception ex) {
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
