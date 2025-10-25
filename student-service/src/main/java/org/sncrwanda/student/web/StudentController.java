package org.sncrwanda.student.web;

import jakarta.validation.Valid;
import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.dto.StudentRequest;
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.repo.GuardianRepo;
import org.sncrwanda.student.service.StudentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/students")
public class StudentController {

    private final StudentService studentService;
    private final GuardianRepo guardianRepo;

    public StudentController(StudentService studentService, GuardianRepo guardianRepo) {
        this.studentService = studentService;
        this.guardianRepo = guardianRepo;
    }

    // Guardian endpoints
    @PostMapping("/guardians")
    public ResponseEntity<Guardian> createGuardian(@Valid @RequestBody Guardian g) {
        Guardian saved = guardianRepo.save(g);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/guardians")
    public List<Guardian> listGuardians() {
        return guardianRepo.findAll();
    }

    // Student endpoints
    @PostMapping
    public ResponseEntity<StudentResponse> createStudent(@Valid @RequestBody StudentRequest req) {
        StudentResponse resp = studentService.create(req);
        return ResponseEntity.status(201).body(resp);
    }

    @GetMapping
    public List<StudentResponse> listStudents() {
        return studentService.listAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentResponse> getStudent(@PathVariable UUID id) {
        return studentService.getById(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentResponse> updateStudent(@PathVariable UUID id, @Valid @RequestBody StudentRequest req) {
        return studentService.update(id, req).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable UUID id) {
        boolean deleted = studentService.delete(id);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
    
    @PutMapping("/{id}/restore")
    public ResponseEntity<Void> restoreStudent(@PathVariable UUID id) {
        boolean restored = studentService.restore(id);
        return restored ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }
    
    // Guardian endpoints with soft delete
    @DeleteMapping("/guardians/{id}")
    public ResponseEntity<Void> deleteGuardian(@PathVariable UUID id) {
        return guardianRepo.findById(id).map(guardian -> {
            guardian.setDeleted(true);
            guardian.setDeletedAt(java.time.LocalDateTime.now());
            guardianRepo.save(guardian);
            return ResponseEntity.noContent().<Void>build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PutMapping("/guardians/{id}/restore")
    public ResponseEntity<Void> restoreGuardian(@PathVariable UUID id) {
        return guardianRepo.findById(id).map(guardian -> {
            guardian.setDeleted(false);
            guardian.setRestoredAt(java.time.LocalDateTime.now());
            guardian.setDeletedAt(null);
            guardianRepo.save(guardian);
            return ResponseEntity.noContent().<Void>build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
    
    @PutMapping("/guardians/{id}")
    public ResponseEntity<Guardian> updateGuardian(@PathVariable UUID id, @Valid @RequestBody Guardian updatedGuardian) {
        return guardianRepo.findById(id).map(guardian -> {
            guardian.setFirstName(updatedGuardian.getFirstName());
            guardian.setLastName(updatedGuardian.getLastName());
            guardian.setPhone(updatedGuardian.getPhone());
            guardian.setEmail(updatedGuardian.getEmail());
            guardian.setAddress(updatedGuardian.getAddress());
            Guardian saved = guardianRepo.save(guardian);
            return ResponseEntity.ok(saved);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
