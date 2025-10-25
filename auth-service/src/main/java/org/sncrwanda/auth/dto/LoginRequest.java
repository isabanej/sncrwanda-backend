package org.sncrwanda.auth.dto;

public class LoginRequest {
    private String username;
    private String password;
    
    public LoginRequest() {}
    
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    
    // Alias for username (used by GlobalExceptionHandler and frontend)
    public String getUsernameOrEmail() { return username; }
    public void setUsernameOrEmail(String usernameOrEmail) { this.username = usernameOrEmail; }
}