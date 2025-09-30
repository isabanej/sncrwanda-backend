package config;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@SpringBootConfiguration
@EnableAutoConfiguration
@EntityScan(basePackages = "org.sncrwanda.student.domain")
@EnableJpaRepositories(basePackages = "org.sncrwanda.student.repo")
public class TestJpaApplication { }
