package org.sncrwanda.gateway.web;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class DocsController {
  @GetMapping("/")
  public String index(){
    return """
      <h2>SNCRWANDA Services</h2>
      <ul>
        <li><a href="http://localhost:9090/swagger-ui/index.html">API Gateway Swagger UI (http://localhost:9090)</a></li>
        <li><a href="http://localhost:9092/swagger-ui/index.html">Auth Service - http://localhost:9092 (Auth)</a></li>
        <li><a href="http://localhost:9091/swagger-ui/index.html">Ledger Service - http://localhost:9091 (Ledger)</a></li>
        <li><a href="http://localhost:9094/swagger-ui/index.html">HR Service - http://localhost:9094 (HR)</a></li>
        <li><a href="http://localhost:9095/swagger-ui/index.html">Student Service - http://localhost:9095 (Students)</a></li>
        <li><a href="http://localhost:9096/swagger-ui/index.html">Reporting Service - http://localhost:9096 (Reporting)</a></li>
      </ul>
    """;
  }
}
