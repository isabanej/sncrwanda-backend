package config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;

@TestConfiguration
public class TestSecurityConfig {
    @Bean
    WebSecurityCustomizer testWebSecurityCustomizer() {
        return web -> web.ignoring().anyRequest();
    }
}
