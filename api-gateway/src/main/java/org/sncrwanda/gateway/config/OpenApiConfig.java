package org.sncrwanda.gateway.config;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
// Removed @Configuration to avoid duplicate bean definition with org.sncrwanda.gateway.OpenApiConfig
//@Configuration
@Deprecated // Replaced by org.sncrwanda.gateway.OpenApiConfig
public class OpenApiConfig {
  @Bean OpenAPI api() { return new OpenAPI().info(new Info().title("API Gateway").version("v1")); }
}
