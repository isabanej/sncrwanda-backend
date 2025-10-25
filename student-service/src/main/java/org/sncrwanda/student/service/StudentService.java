package org.sncrwanda.student.service;

import org.sncrwanda.student.domain.Student;
import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.domain.Need;
import org.sncrwanda.student.dto.StudentRequest;
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.repo.StudentRepo;
import org.sncrwanda.student.repo.GuardianRepo;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.HashSet;

@Service
public class StudentService {
    
    private final StudentRepo studentRepo;
    private final GuardianRepo guardianRepo;
    
    public StudentService(StudentRepo studentRepo, GuardianRepo guardianRepo) {
        this.studentRepo = studentRepo;
        this.guardianRepo = guardianRepo;
    }
    
    public StudentResponse create(StudentRequest request) {
        Student student = new Student();
        student.setChildFirstName(request.getChildFirstName());
        student.setChildLastName(request.getChildLastName());
        student.setChildDob(request.getChildDob());
        student.setHobbies(request.getHobbies());
        
        // Convert string needs to Need enum
        if (request.getNeeds() != null && !request.getNeeds().isEmpty()) {
            Set<Need> needsSet = request.getNeeds().stream()
                .map(String::toUpperCase)
                .map(s -> s.replace(" ", "_").replace("/", "_").replace("(", "").replace(")", ""))
                .map(Need::valueOf)
                .collect(Collectors.toSet());
            student.setNeeds(needsSet);
        }
        
        student.setNeedsOtherText(request.getNeedsOtherText());
        
        // Find guardian
        if (request.getGuardianId() != null) {
            Guardian guardian = guardianRepo.findById(request.getGuardianId()).orElse(null);
            student.setGuardian(guardian);
        }
        
        Student saved = studentRepo.save(student);
        return toResponse(saved);
    }
    
    public List<StudentResponse> listAll() {
        return studentRepo.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    public Optional<StudentResponse> getById(UUID id) {
        return studentRepo.findById(id).map(this::toResponse);
    }
    
    public Optional<StudentResponse> update(UUID id, StudentRequest request) {
        return studentRepo.findById(id).map(student -> {
            student.setChildFirstName(request.getChildFirstName());
            student.setChildLastName(request.getChildLastName());
            student.setChildDob(request.getChildDob());
            student.setHobbies(request.getHobbies());
            
            // Convert string needs to Need enum
            if (request.getNeeds() != null && !request.getNeeds().isEmpty()) {
                Set<Need> needsSet = request.getNeeds().stream()
                    .map(String::toUpperCase)
                    .map(s -> s.replace(" ", "_").replace("/", "_").replace("(", "").replace(")", ""))
                    .map(Need::valueOf)
                    .collect(Collectors.toSet());
                student.setNeeds(needsSet);
            }
            
            student.setNeedsOtherText(request.getNeedsOtherText());
            
            if (request.getGuardianId() != null) {
                Guardian guardian = guardianRepo.findById(request.getGuardianId()).orElse(null);
                student.setGuardian(guardian);
            }
            
            Student saved = studentRepo.save(student);
            return toResponse(saved);
        });
    }
    
    public boolean delete(UUID id) {
        if (studentRepo.existsById(id)) {
            // Soft delete: set isDeleted to true instead of removing from database
            return studentRepo.findById(id).map(student -> {
                student.setDeleted(true);
                student.setDeletedAt(java.time.LocalDateTime.now());
                studentRepo.save(student);
                return true;
            }).orElse(false);
        }
        return false;
    }
    
    public boolean restore(UUID id) {
        return studentRepo.findById(id).map(student -> {
            student.setDeleted(false);
            student.setRestoredAt(java.time.LocalDateTime.now());
            student.setDeletedAt(null);
            studentRepo.save(student);
            return true;
        }).orElse(false);
    }
    
    private StudentResponse toResponse(Student student) {
        StudentResponse response = new StudentResponse();
        response.setId(student.getId());
        response.setGuardianId(student.getGuardian() != null ? student.getGuardian().getId() : null);
        response.setChildFirstName(student.getChildFirstName());
        response.setChildLastName(student.getChildLastName());
        response.setChildDob(student.getChildDob());
        response.setHobbies(student.getHobbies());
        
        // Convert Need enum to strings
        if (student.getNeeds() != null && !student.getNeeds().isEmpty()) {
            Set<String> needsStrings = student.getNeeds().stream()
                .map(Need::name)
                .collect(Collectors.toSet());
            response.setNeeds(needsStrings);
        }
        
        response.setNeedsOtherText(student.getNeedsOtherText());
        response.setIsDeleted(student.isDeleted());
        response.setBranchId(student.getOrgId());
        return response;
    }
}