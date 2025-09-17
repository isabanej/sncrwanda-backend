package org.sncrwanda.student.repo;
import org.sncrwanda.student.domain.Guardian;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface GuardianRepo extends JpaRepository<Guardian, UUID> {}
