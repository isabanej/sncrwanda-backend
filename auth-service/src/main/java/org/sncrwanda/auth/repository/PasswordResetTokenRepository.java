package org.sncrwanda.auth.repository;

import org.sncrwanda.auth.domain.PasswordResetToken;
import org.sncrwanda.auth.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, java.util.UUID> {
    Optional<PasswordResetToken> findByToken(String token);
    void deleteByUser(User user);
}
