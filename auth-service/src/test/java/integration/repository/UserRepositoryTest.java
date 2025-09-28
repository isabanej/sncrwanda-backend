package org.sncrwanda.auth.repository;

import org.junit.jupiter.api.Test;
import org.sncrwanda.auth.domain.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
class UserRepositoryTest {
    @Autowired UserRepository repo;

    @Test
    void save_and_query_by_username_and_email() {
        User u = User.builder()
                .username("alice")
                .email("alice@example.com")
                .password("secret")
                .roles(Set.of("ADMIN"))
                .build();
        repo.save(u);
        assertNotNull(u.getId());
        assertTrue(repo.existsByUsername("alice"));
        assertTrue(repo.existsByEmail("alice@example.com"));
        assertTrue(repo.findByUsername("alice").isPresent());
        assertTrue(repo.findByEmail("alice@example.com").isPresent());
    }
}
