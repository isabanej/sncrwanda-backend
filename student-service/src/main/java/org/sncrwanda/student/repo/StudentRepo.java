package org.sncrwanda.student.repo;
import org.sncrwanda.student.domain.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;
public interface StudentRepo extends JpaRepository<Student, UUID> {}
