package org.sncrwanda.auth.web;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
record LoginRequest(String email, String password) {}
record TokenResponse(String accessToken, String refreshToken) {}
@RestController @RequestMapping("/auth")
public class AuthController {
  @PostMapping("/login")
  public ResponseEntity<TokenResponse> login(@RequestBody LoginRequest req){
    return ResponseEntity.ok(new TokenResponse("dev-access-token", "dev-refresh-token"));
  }
}
