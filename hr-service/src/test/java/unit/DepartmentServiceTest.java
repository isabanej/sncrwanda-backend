package unit;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.sncrwanda.hr.domain.Branch;
import org.sncrwanda.hr.domain.Department;
import org.sncrwanda.hr.dto.DepartmentRequest;
import org.sncrwanda.hr.dto.DepartmentResponse;
import org.sncrwanda.hr.repository.BranchRepository;
import org.sncrwanda.hr.repository.DepartmentRepository;
import org.sncrwanda.hr.service.DepartmentService;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DepartmentServiceTest {
    @Mock DepartmentRepository departmentRepository;
    @Mock BranchRepository branchRepository;
    @InjectMocks DepartmentService service;

    @Test
    void createDepartment_success() {
        DepartmentRequest req = new DepartmentRequest();
        req.setName("Science");
        UUID branchId = UUID.randomUUID();
        req.setBranchId(branchId);
        when(departmentRepository.existsByName("Science")).thenReturn(false);
        Branch branch = Branch.builder().id(branchId).name("B").address("Addr").build();
        when(branchRepository.findById(branchId)).thenReturn(Optional.of(branch));
        when(departmentRepository.save(any(Department.class))).thenAnswer(inv -> {
            Department d = inv.getArgument(0);
            d.setId(UUID.randomUUID());
            return d;
        });

        DepartmentResponse resp = service.createDepartment(req);
        assertNotNull(resp.getId());
        assertEquals("Science", resp.getName());
        assertEquals(branchId, resp.getBranchId());
    }

    @Test
    void createDepartment_conflictName() {
        DepartmentRequest req = new DepartmentRequest();
        req.setName("Science");
        req.setBranchId(UUID.randomUUID());
        when(departmentRepository.existsByName("Science")).thenReturn(true);
        assertThrows(RuntimeException.class, () -> service.createDepartment(req));
        verify(departmentRepository, never()).save(any());
    }
}

