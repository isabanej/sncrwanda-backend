package org.sncrwanda.gateway.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Enumeration;

@RestController
public class ProxyController {
    
    private final RestTemplate restTemplate = new RestTemplate();
    
    @Value("${services.auth}")
    private String authServiceUrl;
    @Value("${services.ledger}")
    private String ledgerServiceUrl;
    @Value("${services.hr}")
    private String hrServiceUrl;
    @Value("${services.student}")
    private String studentServiceUrl;
    
    // Special handler for multipart/form-data file uploads
    // @Order(1) ensures this matches before the generic /ledger/** handler
    @Order(1)
    @PostMapping(value = "/ledger/api/cashflow/import/**", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> proxyMultipartLedgerRequest(
            HttpServletRequest request,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String orgId,
            @RequestParam(required = false) String importedBy) {
        
        try {
            String path = request.getRequestURI();
            // Strip /ledger prefix before forwarding to ledger service
            // Use substring instead of regex for clarity
            String ledgerPath = path.startsWith("/ledger") ? path.substring(7) : path;
            String targetUrl = ledgerServiceUrl + ledgerPath;
            
            // Build multipart request
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", file.getResource());
            if (orgId != null) body.add("orgId", orgId);
            if (importedBy != null) body.add("importedBy", importedBy);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            // Copy Authorization header
            Enumeration<String> headerNames = request.getHeaderNames();
            while (headerNames.hasMoreElements()) {
                String headerName = headerNames.nextElement();
                if (headerName.equalsIgnoreCase("Authorization")) {
                    headers.add(headerName, request.getHeader(headerName));
                }
            }
            
            HttpEntity<MultiValueMap<String, Object>> entity = new HttpEntity<>(body, headers);
            return restTemplate.postForEntity(targetUrl, entity, String.class);
            
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("{\"error\":\"Gateway multipart routing failed: " + e.getMessage() + "\"}");
        }
    }
    
    @RequestMapping(value = "/auth/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<String> proxyAuthService(
            HttpServletRequest request,
            @RequestBody(required = false) String body) {
        
        // Extract the path after /auth
        String path = request.getRequestURI();
        
        // Preserve query parameters
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            path = path + "?" + queryString;
        }
        
        String targetUrl = authServiceUrl + path;
        
        // Copy headers from the original request
        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String headerValue = request.getHeader(headerName);
            headers.add(headerName, headerValue);
        }
        
        // Create the HTTP entity with body and headers
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        
        // Determine HTTP method
        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        
        try {
            // Forward the request to auth-service
            ResponseEntity<String> response = restTemplate.exchange(
                targetUrl,
                method,
                entity,
                String.class
            );
            
            return response;
            
        } catch (Exception e) {
            // Return error response
            return ResponseEntity.status(500)
                .body("{\"error\":\"Gateway routing failed: " + e.getMessage() + "\"}");
        }
    }

    @RequestMapping(value = "/users/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<String> proxyUsersToAuthService(
            HttpServletRequest request,
            @RequestBody(required = false) String body) {
        
        // Route /users to auth-service
        String path = request.getRequestURI();
        
        // Preserve query parameters
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            path = path + "?" + queryString;
        }
        
        String targetUrl = authServiceUrl + path;
        
        // Copy headers from the original request
        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String headerValue = request.getHeader(headerName);
            headers.add(headerName, headerValue);
        }
        
        // Create the HTTP entity with body and headers
        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        
        // Determine HTTP method
        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        
        try {
            // Forward the request to auth-service
            ResponseEntity<String> response = restTemplate.exchange(
                targetUrl,
                method,
                entity,
                String.class
            );
            
            return response;
            
        } catch (Exception e) {
            // Return error response
            return ResponseEntity.status(500)
                .body("{\"error\":\"Gateway routing failed: " + e.getMessage() + "\"}");
        }
    }

    @RequestMapping(
        value = "/ledger/**",
        method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE}
    )
    public ResponseEntity<String> proxyLedgerService(
            HttpServletRequest request,
            @RequestBody(required = false) String body) {

        String path = request.getRequestURI();
        
        // Skip if this is a multipart request - let the dedicated handler take it
        String contentType = request.getContentType();
        if (contentType != null && contentType.toLowerCase().contains("multipart/form-data")) {
            // This shouldn't happen, but just in case - return error to debug
            return ResponseEntity.status(500)
                .body("{\"error\":\"Multipart request reached wrong handler. Path: " + path + "\"}");
        }
        
        // Strip /ledger prefix before forwarding to ledger service  
        // Use substring instead of regex for clarity
        String ledgerPath = path.startsWith("/ledger") ? path.substring(7) : path;
        
        // Preserve query parameters
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            ledgerPath = ledgerPath + "?" + queryString;
        }
        
        String targetUrl = ledgerServiceUrl + ledgerPath;

        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String headerValue = request.getHeader(headerName);
            headers.add(headerName, headerValue);
        }

        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        try {
            return restTemplate.exchange(targetUrl, method, entity, String.class);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("{\"error\":\"Gateway routing failed: " + e.getMessage() + "\"}");
        }
    }

    @RequestMapping(value = "/hr/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<String> proxyHrService(
            HttpServletRequest request,
            @RequestBody(required = false) String body) {

        String path = request.getRequestURI();
        
        // Preserve query parameters
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            path = path + "?" + queryString;
        }
        
        String targetUrl = hrServiceUrl + path;

        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String headerValue = request.getHeader(headerName);
            headers.add(headerName, headerValue);
        }

        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        try {
            return restTemplate.exchange(targetUrl, method, entity, String.class);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("{\"error\":\"Gateway routing failed: " + e.getMessage() + "\"}");
        }
    }

    @RequestMapping(value = "/students/**", method = {RequestMethod.GET, RequestMethod.POST, RequestMethod.PUT, RequestMethod.DELETE})
    public ResponseEntity<String> proxyStudentService(
            HttpServletRequest request,
            @RequestBody(required = false) String body) {

        String path = request.getRequestURI();
        
        // Preserve query parameters
        String queryString = request.getQueryString();
        if (queryString != null && !queryString.isEmpty()) {
            path = path + "?" + queryString;
        }
        
        String targetUrl = studentServiceUrl + path;

        HttpHeaders headers = new HttpHeaders();
        Enumeration<String> headerNames = request.getHeaderNames();
        while (headerNames.hasMoreElements()) {
            String headerName = headerNames.nextElement();
            String headerValue = request.getHeader(headerName);
            headers.add(headerName, headerValue);
        }

        HttpEntity<String> entity = new HttpEntity<>(body, headers);
        HttpMethod method = HttpMethod.valueOf(request.getMethod());
        try {
            return restTemplate.exchange(targetUrl, method, entity, String.class);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("{\"error\":\"Gateway routing failed: " + e.getMessage() + "\"}");
        }
    }

    @GetMapping("/api/dashboard/stats")
    public ResponseEntity<String> getDashboardStats() {
        try {
            // Fetch counts from each service
            String studentsResponse = restTemplate.getForObject(studentServiceUrl + "/students", String.class);
            String employeesResponse = restTemplate.getForObject(hrServiceUrl + "/hr/employees", String.class);
            String transactionsResponse = restTemplate.getForObject(ledgerServiceUrl + "/ledger/transactions", String.class);
            
            // Count items (simple array length check)
            int studentCount = countJsonArrayItems(studentsResponse);
            int employeeCount = countJsonArrayItems(employeesResponse);
            int transactionCount = countJsonArrayItems(transactionsResponse);
            
            String stats = String.format(
                "{\"students\":%d,\"employees\":%d,\"transactions\":%d,\"reports\":0}",
                studentCount, employeeCount, transactionCount
            );
            
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("{\"error\":\"Failed to fetch dashboard stats: " + e.getMessage() + "\"}");
        }
    }
    
    @GetMapping({"/api/dashboard", "/dashboard"})
    public ResponseEntity<String> getDashboard() {
        // Return the same stats for now
        return getDashboardStats();
    }
    
    @GetMapping("/api/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("{\"status\":\"UP\",\"timestamp\":\"" + java.time.Instant.now() + "\"}");
    }
    
    @GetMapping({"/reports/summary", "/_reporting/reports/summary"})
    public ResponseEntity<String> getReportsSummary() {
        try {
            // Fetch counts from each service
            String studentsResponse = restTemplate.getForObject(studentServiceUrl + "/students", String.class);
            String employeesResponse = restTemplate.getForObject(hrServiceUrl + "/hr/employees", String.class);
            String transactionsResponse = restTemplate.getForObject(ledgerServiceUrl + "/ledger/transactions", String.class);
            
            // Count items
            int studentCount = countJsonArrayItems(studentsResponse);
            int employeeCount = countJsonArrayItems(employeesResponse);
            int transactionCount = countJsonArrayItems(transactionsResponse);
            
            // Return in format expected by Dashboard: studentCount, employeeCount, transactionCount, studentReportCount
            String summary = String.format(
                "{\"studentCount\":%d,\"employeeCount\":%d,\"transactionCount\":%d,\"studentReportCount\":0}",
                studentCount, employeeCount, transactionCount
            );
            
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("{\"error\":\"Failed to fetch reports summary: " + e.getMessage() + "\"}");
        }
    }
    
    private int countJsonArrayItems(String json) {
        if (json == null || json.trim().isEmpty()) return 0;
        // Simple count of items in JSON array by counting opening braces/brackets
        int count = 0;
        boolean inString = false;
        for (int i = 0; i < json.length() - 1; i++) {
            char c = json.charAt(i);
            if (c == '"' && (i == 0 || json.charAt(i-1) != '\\')) {
                inString = !inString;
            }
            if (!inString && c == '{' && i > 0 && json.charAt(i-1) == '[') {
                count++;
            }
        }
        return count > 0 ? count : (json.startsWith("[") && json.contains("{") ? 1 : 0);
    }
}