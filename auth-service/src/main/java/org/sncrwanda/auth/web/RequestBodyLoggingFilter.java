package org.sncrwanda.auth.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestBodyLoggingFilter extends HttpFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestBodyLoggingFilter.class);
    // Toggle verbose request-body logging via application properties
    @org.springframework.beans.factory.annotation.Value("${auth.logging.body.enabled:false}")
    private boolean authBodyLoggingEnabled;

    @Override
    protected void doFilter(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws IOException, ServletException {
    String path = req.getRequestURI();
    // match either /auth/login (direct) or /login (gateway may strip /auth)
    if ((path != null) && (path.endsWith("/login")) && "POST".equalsIgnoreCase(req.getMethod())) {
            try (InputStream in = req.getInputStream()) {
                ByteArrayOutputStream baos = new ByteArrayOutputStream();
                byte[] buffer = new byte[4096];
                int read;
                while ((read = in.read(buffer)) != -1) baos.write(buffer, 0, read);
                byte[] body = baos.toByteArray();
                String ct = req.getContentType();
                if (authBodyLoggingEnabled) {
                    log.warn("[FILTER-DEBUG] /auth/login Content-Type: {}", ct);
                    String raw = new String(body, StandardCharsets.UTF_8);
                    String snippet = raw.length() > 2000 ? raw.substring(0, 2000) + "..." : raw;
                    log.warn("[FILTER-DEBUG] /auth/login raw body (utf8, trimmed): {}", snippet);
                }
                // wrap the request so downstream can read the body
                CachedBodyHttpServletRequest wrapped = new CachedBodyHttpServletRequest(req, body);
                chain.doFilter(wrapped, res);
                return;
            } catch (Exception e) {
                log.warn("Failed to log /auth/login body: {}", e.toString());
            }
        }
        chain.doFilter(req, res);
    }
}
