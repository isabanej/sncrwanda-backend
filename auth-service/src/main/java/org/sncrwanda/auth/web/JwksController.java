package org.sncrwanda.auth.web;

import org.sncrwanda.auth.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collections;
import java.util.Map;

@RestController
@RequestMapping("/.well-known")
public class JwksController {

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping(value = "/jwks.json", produces = "application/json")
    public Map<String,Object> jwks() {
        return Collections.singletonMap("keys", Collections.singletonList(jwtUtil.getJwk()));
    }
}

