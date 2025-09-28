package org.sncrwanda.auth.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DebugHashPrinter {
    // TEMP bean to log hash for password 123456; remove after use.
    @Bean
    CommandLineRunner printHash123456(PasswordEncoder encoder) {
        return args -> {
            String hash = encoder.encode("123456");
            System.out.println("DEBUG_BCRYPT_123456=" + hash);
        };
    }
}
