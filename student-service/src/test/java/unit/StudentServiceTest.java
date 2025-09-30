package unit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.domain.Student;
import org.sncrwanda.student.dto.StudentRequest;
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.repo.GuardianRepo;
import org.sncrwanda.student.repo.StudentRepo;
import org.sncrwanda.student.security.SecurityUtils;
import org.sncrwanda.student.service.StudentService;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentServiceTest {
    @Mock StudentRepo studentRepo;
    @Mock GuardianRepo guardianRepo;
    @InjectMocks StudentService service;

    @Test
    void create_preservesProvidedBranch_evenForNonAdmin() {
        UUID userBranch = UUID.randomUUID();
        UUID guardianId = UUID.randomUUID();
        Guardian g = Guardian.builder().id(guardianId).fullName("P").phone("078").build();
        when(guardianRepo.findById(guardianId)).thenReturn(Optional.of(g));
        when(studentRepo.save(any(Student.class))).thenAnswer(inv -> {
            Student s = inv.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        StudentRequest req = new StudentRequest();
        req.setGuardianId(guardianId);
        req.setChildName("Child");
        req.setChildDob(LocalDate.of(2015,5,10));
        req.setNeeds(Set.of());

        try (MockedStatic<SecurityUtils> st = Mockito.mockStatic(SecurityUtils.class)) {
            st.when(SecurityUtils::isAdmin).thenReturn(false);
            st.when(SecurityUtils::getBranchId).thenReturn(userBranch);

            // arbitrary branch (mismatch formerly rejected) now accepted
            UUID arbitraryBranch = UUID.randomUUID();
            req.setBranchId(arbitraryBranch);
            StudentResponse resp1 = service.create(req);
            assertEquals(arbitraryBranch, resp1.getBranchId());

            // Provided different branch again also accepted
            UUID secondBranch = UUID.randomUUID();
            req.setBranchId(secondBranch);
            StudentResponse resp2 = service.create(req);
            assertEquals(secondBranch, resp2.getBranchId());
        }
    }
}

