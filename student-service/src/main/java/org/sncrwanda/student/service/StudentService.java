package org.sncrwanda.student.service;

import org.sncrwanda.student.domain.Guardian;
import org.sncrwanda.student.domain.Student;
import org.sncrwanda.student.dto.StudentRequest;
import org.sncrwanda.student.dto.StudentResponse;
import org.sncrwanda.student.repo.GuardianRepo;
import org.sncrwanda.student.repo.StudentRepo;
import org.sncrwanda.student.security.SecurityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StudentService {
    @Autowired
    private StudentRepo studentRepo;
    @Autowired
    private GuardianRepo guardianRepo;

    public List<StudentResponse> listAll() {
        // Branch filtering removed per request: always return all active students.
        List<Student> raw = studentRepo.findAllActive();
        try {
            org.slf4j.LoggerFactory.getLogger(StudentService.class)
                .info("listAll students (branch filtering disabled) count={}", raw.size());
        } catch (Exception ignore) {}
        return raw.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // New: include deleted/archived students as well (explicit for selection UI per latest request)
    public List<StudentResponse> listAllIncludingDeleted() {
        List<Student> raw = studentRepo.findAll();
        try {
            org.slf4j.LoggerFactory.getLogger(StudentService.class)
                .info("listAllIncludingDeleted students total={} (includes archived)", raw.size());
        } catch (Exception ignore) {}
        return raw.stream().map(this::toResponse).collect(Collectors.toList());
    }

    // Internal diagnostic: returns raw active students without branch filtering (admin guarded at controller level)
    public List<Student> _debugAllActive() {
        return studentRepo.findAllActive();
    }

    public List<StudentResponse> listArchived() {
        // Branch filtering removed: return all archived students regardless of caller branch.
        return studentRepo.findAllArchived().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<StudentResponse> getById(UUID id) {
        Optional<Student> opt = studentRepo.findById(id);
        if (opt.isEmpty()) return Optional.empty();
        return opt.map(this::toResponse);
    }

    @Transactional
    public StudentResponse create(StudentRequest req) {
        Guardian guardian = guardianRepo.findById(req.getGuardianId()).orElseThrow(() -> new RuntimeException("Guardian not found"));
        UUID requestedBranch = req.getBranchId();
        // Branch enforcement removed: honor provided branchId as-is (may be null).
        Student s = new Student();
        s.setGuardian(guardian);
        s.setChildName(req.getChildName());
        s.setChildDob(req.getChildDob());
        s.setHobbies(req.getHobbies());
        s.setNeeds(req.getNeeds());
        s.setNeedsOtherText(req.getNeedsOtherText());
        if (requestedBranch != null) s.setBranchId(requestedBranch);
        s = studentRepo.save(s);
        return toResponse(s);
    }

    @Transactional
    public Optional<StudentResponse> update(UUID id, StudentRequest req) {
        return studentRepo.findById(id).map(s -> {
            // Branch enforcement removed.
            Guardian guardian = guardianRepo.findById(req.getGuardianId()).orElseThrow(() -> new RuntimeException("Guardian not found"));
            s.setGuardian(guardian);
            s.setChildName(req.getChildName());
            s.setChildDob(req.getChildDob());
            s.setHobbies(req.getHobbies());
            s.setNeeds(req.getNeeds());
            s.setNeedsOtherText(req.getNeedsOtherText());
            if (req.getBranchId() != null) s.setBranchId(req.getBranchId());
            return toResponse(studentRepo.save(s));
        });
    }

    @Transactional
    public boolean delete(UUID id) {
        Optional<Student> opt = studentRepo.findById(id);
        if (opt.isEmpty()) return false;
        // Branch enforcement removed for delete.
        // Capture deleter metadata similar to Guardian
        UUID userId = SecurityUtils.getUserId();
        var jwt = SecurityUtils.getJwt();
        String deleterName = null;
        String deleterPhone = null;
        if (jwt != null) {
            Object nameClaim = jwt.getClaim("name");
            Object phoneClaim = jwt.getClaim("phone");
            deleterName = java.util.Objects.toString(nameClaim, null);
            deleterPhone = java.util.Objects.toString(phoneClaim, null);
        }
        int affected = studentRepo.softDelete(id, userId, deleterName, deleterPhone, java.time.Instant.now());
        return affected > 0;
    }

    @Transactional
    public boolean restore(UUID id) {
        Optional<Student> opt = studentRepo.findById(id);
        if (opt.isEmpty() || !opt.get().isDeleted()) return false;
        // Branch enforcement removed for restore.
        int affected = studentRepo.restore(id);
        return affected > 0;
    }

    private StudentResponse toResponse(Student s) {
        StudentResponse r = new StudentResponse();
        r.setId(s.getId());
        r.setGuardianId(s.getGuardian() != null ? s.getGuardian().getId() : null);
        r.setChildName(s.getChildName());
        r.setChildDob(s.getChildDob());
        r.setHobbies(s.getHobbies());
        r.setNeeds(s.getNeeds());
        r.setNeedsOtherText(s.getNeedsOtherText());
        r.setBranchId(s.getBranchId());
        r.setCreatedAt(s.getCreatedAt());
        return r;
    }
}
