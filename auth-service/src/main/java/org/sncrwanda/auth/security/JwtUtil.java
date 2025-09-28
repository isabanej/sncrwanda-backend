package org.sncrwanda.auth.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import org.springframework.stereotype.Component;

import java.math.BigInteger;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.HashMap;

@Component
public class JwtUtil {
    private final KeyPair keyPair;
    private final String keyId = "auth-key-1";
    private final long jwtExpirationMs = 86400000; // 1 day

    public JwtUtil() throws RuntimeException {
        try {
            KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
            keyGen.initialize(2048);
            this.keyPair = keyGen.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    public String generateToken(UUID userId, String username, Set<String> roles) {
        var builder = Jwts.builder()
                .setSubject(userId.toString())
                .claim("username", username)
                .claim("roles", roles)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .setHeaderParam("kid", keyId)
                .signWith(keyPair.getPrivate(), SignatureAlgorithm.RS256);
        return builder.compact();
    }

    public UUID getUserIdFromToken(String token) {
        var claims = Jwts.parserBuilder().setSigningKey(keyPair.getPublic()).build().parseClaimsJws(token).getBody();
        return UUID.fromString(claims.getSubject());
    }

    public String getUsernameFromToken(String token) {
        var claims = Jwts.parserBuilder().setSigningKey(keyPair.getPublic()).build().parseClaimsJws(token).getBody();
        return claims.get("username", String.class);
    }

    public Set<String> getRolesFromToken(String token) {
        var claims = Jwts.parserBuilder().setSigningKey(keyPair.getPublic()).build().parseClaimsJws(token).getBody();
        return Set.copyOf(claims.get("roles", java.util.List.class));
    }

    public Map<String,Object> getJwk() {
        RSAPublicKey pub = (RSAPublicKey) keyPair.getPublic();
        BigInteger modulus = pub.getModulus();
        BigInteger exponent = pub.getPublicExponent();
        String n = base64Url(modulus.toByteArray());
        String e = base64Url(exponent.toByteArray());
        Map<String,Object> jwk = new HashMap<>();
        jwk.put("kty","RSA");
        jwk.put("use","sig");
        jwk.put("alg","RS256");
        jwk.put("kid", keyId);
        jwk.put("n", n);
        jwk.put("e", e);
        return jwk;
    }

    public PublicKey getPublicKey() {
        return keyPair.getPublic();
    }

    private String base64Url(byte[] input) {
        // strip leading zero byte produced by toByteArray()
        if (input.length > 1 && input[0] == 0) {
            byte[] tmp = new byte[input.length - 1];
            System.arraycopy(input, 1, tmp, 0, tmp.length);
            input = tmp;
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(input);
    }
}
