package org.sncrwanda.student.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.domain.Student;
import org.sncrwanda.student.repo.GuardianRepo;
import org.sncrwanda.student.repo.StudentRepo;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class StudentDataInitializer {
    private final StudentRepo studentRepo;
    private final GuardianRepo guardianRepo;

    @PostConstruct
    public void seedIfEmpty(){
        try {
            long active = studentRepo.findAllActive().size();
            if (active > 0) {
                log.debug("StudentDataInitializer: active students present count={}", active);
                return;
            }
            // Ensure at least one guardian exists
            Guardian guardian = guardianRepo.findAll().stream().filter(g -> !g.isDeleted()).findFirst().orElseGet(() -> {
                Guardian g = new Guardian();
                g.setFullName("Demo Guardian");
                g.setPhone("0788000000");
                g.setAddress("Kigali");
                g.setEmail("guardian@example.com");
                g.setBranchId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
                return guardianRepo.save(g);
            });
            // Create a couple of demo students
            for (String name : List.of("Alice Demo", "Bob Demo")) {
                Student s = new Student();
                s.setGuardian(guardian);
                s.setChildName(name);
                s.setChildDob(LocalDate.of(2015, 1, 1));
                s.setHobbies("Football, Music");
                s.setBranchId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
                studentRepo.save(s);
            }
            log.info("StudentDataInitializer: seeded demo students (2) for empty database");
        } catch (Exception ex) {
            log.warn("StudentDataInitializer: seeding skipped due to error: {}", ex.toString());
        }
    }
}
