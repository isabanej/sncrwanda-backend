package org.sncrwanda.hr.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.UUID;

public final class SecurityUtils {
    private SecurityUtils() {}

    public static Jwt getJwt() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt) return (Jwt) principal;
        return null;
    }

    public static boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) return false;
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals(role) || a.getAuthority().equals("ROLE_" + role));
    }

    public static boolean isAdmin() {
        return hasRole("SUPER_ADMIN") || hasRole("ADMIN");
    }

    public static UUID getBranchId() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        Object val = jwt.getClaim("branchId");
        if (val == null) return null;
        try { return UUID.fromString(val.toString()); } catch (Exception e) { return null; }
    }

    public static UUID getUserId() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        // try subject then claim userId
        String sub = jwt.getSubject();
        if (sub != null) {
            try { return UUID.fromString(sub); } catch (Exception ignored) {}
        }
        Object val = jwt.getClaim("userId");
        if (val == null) return null;
        try { return UUID.fromString(val.toString()); } catch (Exception e) { return null; }
    }

    public static String getEmail() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        Object email = jwt.getClaim("email");
        if (email != null) return email.toString();
        Object preferred = jwt.getClaim("preferred_username");
        if (preferred != null) return preferred.toString();
        Object upn = jwt.getClaim("upn");
        if (upn != null) return upn.toString();
        return null;
    }
}
