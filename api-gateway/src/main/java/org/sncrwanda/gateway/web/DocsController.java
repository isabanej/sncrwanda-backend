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
        <li><a href="/swagger-ui/index.html">Gateway Swagger</a></li>
        <li>http://localhost:8081/swagger-ui/index.html (Auth)</li>
        <li>http://localhost:8082/swagger-ui/index.html (Ledger)</li>
        <li>http://localhost:8083/swagger-ui/index.html (HR)</li>
        <li>http://localhost:8084/swagger-ui/index.html (Students)</li>
        <li>http://localhost:8085/swagger-ui/index.html (Reporting)</li>
      </ul>
    """;
  }
}
