package org.sncrwanda.student.config;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
@Configuration
public class OpenApiConfig {
  @Bean OpenAPI api() { return new OpenAPI().info(new Info().title("Student Service API").version("v1")); }
}
