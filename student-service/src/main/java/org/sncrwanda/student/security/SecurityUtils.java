package org.sncrwanda.student.security;

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
        return isSuperAdmin() || hasRole("ADMIN");
    }

    public static boolean isSuperAdmin() {
        // SUPER_ADMIN role OR username equals reserved 'emino'
        if (hasRole("SUPER_ADMIN")) return true;
        Jwt jwt = getJwt();
        if (jwt != null) {
            Object un = jwt.getClaim("username");
            if (un != null && "emino".equalsIgnoreCase(un.toString())) return true;
        }
        return false;
    }

    public static String getUsername() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        Object un = jwt.getClaim("username");
        return un != null ? un.toString() : null;
    }

    public static UUID getBranchId() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        Object val = jwt.getClaim("branchId");
        if (val == null) return null;
        try {
            return UUID.fromString(val.toString());
        } catch (Exception e) {
            return null;
        }
    }

    public static UUID getUserId() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        String sub = jwt.getSubject();
        if (sub != null) {
            try { return UUID.fromString(sub); } catch (Exception ignored) {}
        }
        Object val = jwt.getClaim("userId");
        if (val == null) return null;
        try { return UUID.fromString(val.toString()); } catch (Exception e) { return null; }
    }

    public static UUID getGuardianId() {
        Jwt jwt = getJwt();
        if (jwt == null) return null;
        Object val = jwt.getClaim("guardianId");
        if (val == null) return null;
        try { return UUID.fromString(val.toString()); } catch (Exception e) { return null; }
    }
}
